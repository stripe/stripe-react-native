package com.reactnativestripesdk.bridgecontracts

import com.facebook.react.bridge.JavaOnlyArray
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.lang.reflect.Modifier

/** One fixture from packages/bridge-contracts/fixtures, as Android sees it. */
class BridgeFixture(
  val name: String,
  val method: String,
  val platforms: List<String>,
  private val input: JSONObject,
  /** shared and android assertions, keyed by dot path. */
  val expected: Map<String, Any?>,
) {
  fun map(param: String): ReadableMap? = (input.opt(param) as? JSONObject)?.let(::toReadableMap)

  fun array(param: String): ReadableArray? = (input.opt(param) as? JSONArray)?.let(::toReadableArray)

  fun string(param: String): String? = input.opt(param) as? String

  /** The parameter as JS's JSON.stringify would send it: function values are dropped. */
  fun jsonString(param: String): String = withoutFunctions(input.getJSONObject(param)).toString()

  private fun withoutFunctions(json: JSONObject): JSONObject {
    val copy = JSONObject()
    for (key in json.keys()) {
      when (val value = json.get(key)) {
        FUNCTION -> Unit
        is JSONObject -> copy.put(key, withoutFunctions(value))
        else -> copy.put(key, value)
      }
    }
    return copy
  }

  fun boolean(param: String): Boolean = input.optBoolean(param)

  override fun toString() = name

  companion object {
    /** Fixture placeholder for a JS function value. */
    const val FUNCTION = "\$function"

    private val directory: File by lazy {
      val path =
        System.getProperty("bridgeContracts.fixturesDir")
          ?: error("bridgeContracts.fixturesDir is not set; see android/build.gradle")
      File(path).also { check(it.isDirectory) { "$it is not a directory" } }
    }

    /**
     * Comma-separated family directory names from test-bridge.mjs `--families=`
     * (`-PbridgeContracts.families`). Absent means every fixture.
     */
    fun allowedFamilies(): Set<String>? {
      val raw = System.getProperty("bridgeContracts.families") ?: return null
      val names = raw.split(',').map { it.trim() }.filter { it.isNotEmpty() }
      if (names.isEmpty()) return null
      return names.toSet()
    }

    /** Fixture names relative to the fixtures directory. Safe outside the Robolectric sandbox. */
    fun names(): List<String> {
      val allowed = allowedFamilies()
      val roots =
        if (allowed == null) {
          listOf(directory)
        } else {
          allowed.map { File(directory, it) }.filter { it.isDirectory }
        }
      return roots
        .asSequence()
        .flatMap { root -> root.walkTopDown().filter { it.isFile && it.extension == "json" } }
        .map { it.relativeTo(directory).path }
        .sorted()
        .toList()
    }

    /** Parses a fixture; org.json needs the Robolectric sandbox. */
    fun load(name: String): BridgeFixture {
      val json = JSONObject(File(directory, name).readText())
      val expect = json.getJSONObject("expect")
      val expected = linkedMapOf<String, Any?>()
      for (block in listOf("shared", "android")) {
        val values = expect.optJSONObject(block) ?: continue
        for (key in values.keys()) expected[key] = values.get(key)
      }
      val platforms =
        json.optJSONArray("platforms")?.let { array -> List(array.length()) { array.getString(it) } }
          ?: listOf("ios", "android")
      return BridgeFixture(
        name = name,
        method = json.getString("method"),
        platforms = platforms,
        input = json.getJSONObject("input"),
        expected = expected,
      )
    }

    /** Numbers arrive from JS as doubles, so the maps hold doubles too. */
    fun toReadableMap(json: JSONObject): ReadableMap {
      val map = JavaOnlyMap()
      for (key in json.keys()) {
        when (val value = json.get(key)) {
          JSONObject.NULL -> map.putNull(key)
          is JSONObject -> map.putMap(key, toReadableMap(value))
          is JSONArray -> map.putArray(key, toReadableArray(value))
          is Boolean -> map.putBoolean(key, value)
          is Number -> map.putDouble(key, value.toDouble())
          else -> map.putString(key, value.toString())
        }
      }
      return DeepMap(map)
    }

    fun toReadableArray(json: JSONArray): ReadableArray {
      val array = JavaOnlyArray()
      for (index in 0 until json.length()) {
        when (val value = json.get(index)) {
          JSONObject.NULL -> array.pushNull()
          is JSONObject -> array.pushMap(toReadableMap(value))
          is JSONArray -> array.pushArray(toReadableArray(value))
          is Boolean -> array.pushBoolean(value)
          is Number -> array.pushDouble(value.toDouble())
          else -> array.pushString(value.toString())
        }
      }
      return DeepArray(array)
    }
  }
}

/**
 * ReadableNativeMap.toHashMap and ReadableNativeArray.toArrayList convert nested values to
 * HashMap and ArrayList, and production code casts to those; JavaOnlyMap leaves them as is.
 */
private class DeepMap(
  private val map: JavaOnlyMap,
) : ReadableMap by map {
  override fun toHashMap(): HashMap<String, Any?> = HashMap(map.toHashMap().mapValues { deep(it.value) })
}

private class DeepArray(
  private val array: JavaOnlyArray,
) : ReadableArray by array {
  override fun toArrayList(): ArrayList<Any?> = ArrayList(array.toArrayList().map(::deep))
}

private fun deep(value: Any?): Any? =
  when (value) {
    is ReadableMap -> value.toHashMap()
    is ReadableArray -> value.toArrayList()
    else -> value
  }

/**
 * What a runner observed after calling the production mapper. Assertion keys
 * are dot paths into [roots]; [aliases] rewrite a logical key prefix to the
 * native path when the two platforms name a property differently.
 */
class BridgeObservation(
  val roots: Map<String, Any?>,
  val aliases: Map<String, String> = emptyMap(),
)

object Missing {
  override fun toString() = "<missing>"
}

object BridgeAssert {
  const val PRESENT = "\$present"

  fun failures(
    fixture: BridgeFixture,
    observation: BridgeObservation,
  ): List<String> {
    val failures = mutableListOf<String>()
    for ((key, expected) in fixture.expected) {
      val nativePath = applyAlias(key, observation.aliases)
      val segments = nativePath.split(".")
      var actual: Any? = if (observation.roots.containsKey(segments[0])) observation.roots[segments[0]] else Missing
      for (segment in segments.drop(1)) actual = child(actual, segment)
      match(expected, actual, key, failures)
    }
    return failures
  }

  private fun applyAlias(
    key: String,
    aliases: Map<String, String>,
  ): String {
    val match =
      aliases.keys
        .filter { key == it || key.startsWith("$it.") }
        .maxByOrNull { it.length } ?: return key
    return aliases.getValue(match) + key.removePrefix(match)
  }

  private fun match(
    expected: Any?,
    actual: Any?,
    path: String,
    failures: MutableList<String>,
  ) {
    when {
      expected == PRESENT -> matchPresent(actual, path, failures)
      expected == null || expected == JSONObject.NULL -> matchNull(actual, path, failures)
      actual === Missing -> matchMissing(expected, path, failures)
      expected is JSONObject && expected.length() == 0 -> matchEmptyObject(actual, path, failures)
      expected is JSONObject -> matchObject(expected, actual, path, failures)
      expected is JSONArray -> matchList(expected, actual, path, failures)
      else -> matchLeaf(expected, actual, path, failures)
    }
  }

  private fun matchPresent(
    actual: Any?,
    path: String,
    failures: MutableList<String>,
  ) {
    if (actual == null || actual === Missing) failures += "$path: expected a value, found $actual"
  }

  private fun matchNull(
    actual: Any?,
    path: String,
    failures: MutableList<String>,
  ) {
    if (actual != null && actual !== Missing) failures += "$path: expected null, found ${describe(actual)}"
  }

  private fun matchMissing(
    expected: Any?,
    path: String,
    failures: MutableList<String>,
  ) {
    failures += "$path: not found (expected $expected)"
  }

  private fun matchEmptyObject(
    actual: Any?,
    path: String,
    failures: MutableList<String>,
  ) {
    if ((normalize(actual) as? Map<*, *>)?.isEmpty() != true) {
      failures += "$path: expected an empty object, found ${describe(actual)}"
    }
  }

  private fun matchObject(
    expected: JSONObject,
    actual: Any?,
    path: String,
    failures: MutableList<String>,
  ) {
    for (key in expected.keys()) match(expected.get(key), child(actual, key), "$path.$key", failures)
  }

  private fun matchLeaf(
    expected: Any?,
    actual: Any?,
    path: String,
    failures: MutableList<String>,
  ) {
    if (!leafEquals(expected, normalize(actual))) {
      failures += "$path: expected $expected, found ${describe(actual)}"
    }
  }

  private fun matchList(
    expected: JSONArray,
    actual: Any?,
    path: String,
    failures: MutableList<String>,
  ) {
    val list = asList(actual)
    when {
      list == null -> failures += "$path: expected a list, found ${describe(actual)}"
      list.size != expected.length() ->
        failures += "$path: expected ${expected.length()} items, found ${list.size}: ${describe(actual)}"
      else -> list.forEachIndexed { index, item -> match(expected.get(index), item, "$path.$index", failures) }
    }
  }

  private fun leafEquals(
    expected: Any?,
    normalized: Any?,
  ): Boolean =
    if (expected is Number && normalized is Number) {
      expected.toDouble() == normalized.toDouble()
    } else {
      expected == normalized
    }

  private fun describe(value: Any?): String =
    when (val normalized = normalize(value)) {
      is String -> "\"$normalized\""
      else -> normalized.toString()
    }

  /** Converts a native leaf to the JSON-like value fixtures assert on. */
  fun normalize(value: Any?): Any? =
    when (value) {
      null, Missing -> value
      is String, is Boolean -> value
      is Number -> value.toDouble()
      is Enum<*> -> if (value.name.all { !it.isLowerCase() }) value.name.lowercase() else value.name.lowerFirst()
      is ReadableMap -> value.toHashMap().mapValues { normalize(it.value) }
      is ReadableArray -> value.toArrayList().map(::normalize)
      is Map<*, *> -> value.entries.associate { it.key.toString() to normalize(it.value) }
      is Iterable<*> -> value.map(::normalize)
      is Array<*> -> value.map(::normalize)
      else ->
        if (isStatelessObject(value) || isNestedSubclass(value)) {
          value.javaClass.simpleName.lowerFirst()
        } else {
          value.toString()
        }
    }

  /** A sealed-hierarchy case such as IntentConfiguration.Mode.Payment, named like an iOS enum case. */
  private fun isNestedSubclass(value: Any): Boolean {
    val type = value.javaClass
    return type.enclosingClass != null && type.superclass == type.enclosingClass
  }

  private fun asList(value: Any?): List<Any?>? =
    when (value) {
      is ReadableArray -> value.toArrayList()
      is Iterable<*> -> value.toList()
      is Array<*> -> value.toList()
      else -> null
    }

  /** A Kotlin `object` or a data-less sealed subclass, such as CardBrandAcceptance.All. */
  private fun isStatelessObject(value: Any): Boolean =
    value.javaClass.declaredFields.none { !Modifier.isStatic(it.modifiers) }

  fun child(
    value: Any?,
    segment: String,
  ): Any? {
    if (value == null || value === Missing) return Missing
    return when (value) {
      is ReadableMap -> if (value.hasKey(segment)) value.toHashMap()[segment] else Missing
      is Map<*, *> -> {
        val entry = value.entries.firstOrNull { it.key.toString() == segment || normalize(it.key) == segment }
        if (entry == null) Missing else entry.value
      }
      is ReadableArray -> child(value.toArrayList(), segment)
      is List<*> -> segment.toIntOrNull()?.let { value.getOrElse(it) { Missing } } ?: Missing
      else -> property(value, segment)
    }
  }

  private fun property(
    value: Any,
    name: String,
  ): Any? {
    val capitalized = name.replaceFirstChar { it.uppercase() }
    val getters = listOf("get$capitalized", "is$capitalized", name)
    val method =
      value.javaClass.methods.firstOrNull { method ->
        method.parameterCount == 0 &&
          !Modifier.isStatic(method.modifiers) &&
          (method.name in getters || getters.any { method.name.startsWith("$it\$") })
      }
    if (method != null) {
      method.isAccessible = true
      return method.invoke(value)
    }
    var type: Class<*>? = value.javaClass
    while (type != null) {
      type.declaredFields.firstOrNull { it.name == name && !Modifier.isStatic(it.modifiers) }?.let { field ->
        field.isAccessible = true
        return field.get(value)
      }
      type = type.superclass
    }
    return Missing
  }

  private fun String.lowerFirst() = replaceFirstChar { it.lowercase() }
}

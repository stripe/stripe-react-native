package com.reactnativestripesdk.bridgecontracts

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class BridgeFixtureFamilyTest {
  @Test
  fun namesIncludesOnlyTheRequestedFamily() {
    val key = "bridgeContracts.families"
    val previous = System.getProperty(key)
    try {
      System.clearProperty(key)
      val all = BridgeFixture.names()
      val familyOf = { name: String -> name.substringBefore('/').substringBefore('\\') }
      val families = all.map(familyOf).distinct()
      check(families.size > 1) { "need two fixture families" }
      val only = families.first()
      System.setProperty(key, only)
      val filtered = BridgeFixture.names()
      assertTrue(filtered.isNotEmpty())
      assertTrue(filtered.all { familyOf(it) == only })
      assertTrue(all.any { familyOf(it) != only })
      assertFalse(filtered.any { familyOf(it) != only })
    } finally {
      if (previous == null) System.clearProperty(key) else System.setProperty(key, previous)
    }
  }

  @Test
  fun emptyFamiliesPropertyListsEveryFixture() {
    val key = "bridgeContracts.families"
    val previous = System.getProperty(key)
    try {
      System.clearProperty(key)
      val unfiltered = BridgeFixture.names()
      System.setProperty(key, "")
      assertEquals(unfiltered, BridgeFixture.names())
      System.setProperty(key, " , ")
      assertEquals(unfiltered, BridgeFixture.names())
    } finally {
      if (previous == null) System.clearProperty(key) else System.setProperty(key, previous)
    }
  }
}

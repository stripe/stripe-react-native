package com.reactnativestripesdk.bridgecontracts

import android.os.Looper
import com.stripe.android.Stripe
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.ParameterizedRobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.LooperMode

/**
 * Runs every Android fixture in packages/bridge-contracts/fixtures through the
 * production mapper for its method and checks the shared and android
 * assertions. See CONTRIBUTING.md, "Bridge contract fixtures".
 */
@RunWith(ParameterizedRobolectricTestRunner::class)
@LooperMode(LooperMode.Mode.PAUSED)
class BridgeContractTest(
  private val name: String,
) {
  @Test
  fun fixtureMatchesTheAndroidMapper() {
    val fixture = BridgeFixture.load(name)
    if ("android" !in fixture.platforms) return
    val runner = BridgeRunners.forMethod[fixture.method] ?: return fail("No Android runner for ${fixture.method}")
    val advancedFraudSignalsEnabled = Stripe.advancedFraudSignalsEnabled
    Stripe.advancedFraudSignalsEnabled = false
    val failures =
      try {
        BridgeAssert.failures(fixture, runner(fixture))
      } finally {
        shadowOf(Looper.getMainLooper()).idle()
        Stripe.advancedFraudSignalsEnabled = advancedFraudSignalsEnabled
      }
    assertTrue("${fixture.name}:\n  ${failures.joinToString("\n  ")}", failures.isEmpty())
  }

  companion object {
    @JvmStatic
    @ParameterizedRobolectricTestRunner.Parameters(name = "{0}")
    fun fixtures(): List<Array<Any>> {
      val names = BridgeFixture.names()
      check(names.isNotEmpty()) { "No bridge contract fixtures found" }
      return names.map { arrayOf(it) }
    }
  }
}

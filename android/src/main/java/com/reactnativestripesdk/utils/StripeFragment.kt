package com.reactnativestripesdk.utils

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.fragment.app.Fragment
import androidx.fragment.app.FragmentActivity

/**
 * Base fragment class to be used to launch Stripe UI that requires a fragment. Use the prepare
 * method to configure it.
 *
 * Note that subclasses of this must implement a no arguments constructor since that is what is
 * invoked when fragments are restored after activity re-creation.
 */
abstract class StripeFragment : Fragment() {
  private var isRestored = false

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    isRestored = savedInstanceState != null
  }

  override fun onCreateView(
    inflater: LayoutInflater,
    container: ViewGroup?,
    savedInstanceState: Bundle?,
  ): View = FrameLayout(requireActivity()).also { it.visibility = View.GONE }

  override fun onViewCreated(
    view: View,
    savedInstanceState: Bundle?,
  ) {
    super.onViewCreated(view, savedInstanceState)

    // Prevent fragment from being re-created.
    if (isRestored) {
      (context as? FragmentActivity)
        ?.supportFragmentManager
        ?.beginTransaction()
        ?.remove(this)
        ?.commitAllowingStateLoss()
    } else {
      prepare()
    }
  }

  abstract fun prepare()
}

package com.reactnativestripesdk

import android.os.Parcel
import android.os.Parcelable
import androidx.annotation.Size
import com.stripe.android.EphemeralKeyProvider
import com.stripe.android.EphemeralKeyUpdateListener
import com.stripe.android.pushProvisioning.PushProvisioningEphemeralKeyProvider

class EphemeralKeyProvider() : EphemeralKeyProvider, PushProvisioningEphemeralKeyProvider, Parcelable {
  constructor(parcel: Parcel) : this() {
  }

  override fun createEphemeralKey(
    @Size(min = 4) apiVersion: String,
    keyUpdateListener: EphemeralKeyUpdateListener
  ) {
    keyUpdateListener.onKeyUpdate("{}")
  }

  override fun writeToParcel(parcel: Parcel, flags: Int) {
//    super.writeToParcel(parcel, flags)
  }

  override fun createEphemeralKey(p0: String, p1: com.stripe.android.pushProvisioning.EphemeralKeyUpdateListener) {
    TODO("Not yet implemented")
  }

  override fun describeContents(): Int {
    return 0
  }

  companion object CREATOR : Parcelable.Creator<EphemeralKeyProvider> {
    override fun createFromParcel(parcel: Parcel): EphemeralKeyProvider {
      return EphemeralKeyProvider(parcel)
    }

    override fun newArray(size: Int): Array<EphemeralKeyProvider?> {
      return arrayOfNulls(size)
    }
  }

}

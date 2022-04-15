package com.reactnativestripesdk

import android.os.Parcel
import android.os.Parcelable
import android.util.Log
import com.stripe.android.pushProvisioning.PushProvisioningEphemeralKeyProvider
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.lang.Error


class EphemeralKeyProvider(private val ephemeralKey: String) : PushProvisioningEphemeralKeyProvider {

  private constructor(parcel: Parcel) : this(
    ephemeralKey = parcel.readString() ?: ""
  )

  override fun describeContents(): Int {
    return hashCode()
  }

  override fun writeToParcel(dest: Parcel, flags: Int) {
    dest.writeString(ephemeralKey)
  }

  override fun createEphemeralKey(apiVersion: String, keyUpdateListener: com.stripe.android.pushProvisioning.EphemeralKeyUpdateListener) {
    keyUpdateListener.onKeyUpdate(ephemeralKey)
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

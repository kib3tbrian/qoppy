package com.yourname.copyboard

import android.app.Application
import android.content.res.Configuration
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader
import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ExpoReactHostFactory
import expo.modules.ReactNativeHostWrapper

class MainApplication : Application(), ReactApplication {

  private val mReactNativeHost: ReactNativeHost = ReactNativeHostWrapper(
    this,
    object : DefaultReactNativeHost(this) {
      override fun getPackages() = PackageList(this).packages
      override fun getJSMainModuleName() = ".expo/.virtual-metro-entry"
      override fun getUseDeveloperSupport() = BuildConfig.DEBUG
      override val isNewArchEnabled = false
      override val isHermesEnabled = true
    }
  )

  override val reactNativeHost: ReactNativeHost get() = mReactNativeHost

  override val reactHost: ReactHost
    get() = ExpoReactHostFactory.createFromReactNativeHost(this, mReactNativeHost)

  override fun onCreate() {
    super.onCreate()
    SoLoader.init(this, OpenSourceMergedSoMapping)
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}

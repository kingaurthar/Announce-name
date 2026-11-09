plugins {
  id("com.android.application")
  id("org.jetbrains.kotlin.android")
}

android {
  namespace = "com.policyfinder.app"
  compileSdk = 35

  defaultConfig {
    applicationId = "com.policyfinder.app"
    minSdk = 26
    targetSdk = 35
    versionCode = (System.getenv("GITHUB_RUN_NUMBER") ?: "1").toInt()
    versionName = "1.0." + (System.getenv("GITHUB_RUN_NUMBER") ?: "0")
  }

  // Fixed personal signing key so every new APK installs as an update
  // over the old one (your saved policies/data are kept).
  signingConfigs {
    create("personal") {
      storeFile = file("${rootDir}/keystore/policyfinder.jks")
      storePassword = "policyfinder"
      keyAlias = "policyfinder"
      keyPassword = "policyfinder"
    }
  }

  buildTypes {
    debug {
      signingConfig = signingConfigs.getByName("personal")
    }
    release {
      isMinifyEnabled = false
      signingConfig = signingConfigs.getByName("personal")
    }
  }

  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
  }
  kotlinOptions { jvmTarget = "17" }

  androidResources { noCompress += listOf("js", "html", "css") }
}

dependencies {
  implementation("androidx.core:core-ktx:1.13.1")
  implementation("androidx.activity:activity-ktx:1.9.3")
  implementation("androidx.webkit:webkit:1.12.1")
}

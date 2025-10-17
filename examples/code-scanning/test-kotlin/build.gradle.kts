import org.gradle.api.tasks.testing.logging.TestExceptionFormat.FULL

plugins {
    id("com.android.application")
    id("com.google.gms.google-services")
    id("kotlin-android")
    id("com.google.firebase.firebase-perf")
    id("kotlin-kapt")
    id("com.google.firebase.crashlytics")
    id("dagger.hilt.android.plugin")
    id("com.google.devtools.ksp")
    id("org.jetbrains.kotlin.plugin.compose")
}

//apply(from = "$rootDir/coverage.gradle")

apply(plugin = "newrelic")

repositories {
    google()
    mavenCentral()
    maven("https://jitpack.io")
    maven("https://foursquare.jfrog.io/foursquare/libs-earlyaccess/")  // for FSQ beta releases
}


dependencies {
    implementation(project(":presence_sdk"))
    implementation(project(":analytics"))
    implementation(project(":privacyconsent"))

    // test
    implementation(project(":storelistscreens"))
    implementation(project(":ads"))
    implementation(project(":location"))

    api(fileTree("libs").matching { include("*.jar") })

    implementation(AndroidX.appCompat)

    api("net.toddm:androidcommframework:_")


    implementation(KotlinX.coroutines.android)
    implementation(KotlinX.coroutines.playServices)

    //Test
    testImplementation(KotlinX.coroutines.core)
    testImplementation(KotlinX.coroutines.test)

    implementation(AndroidX.room.runtime)
    implementation(AndroidX.room.ktx)
    testImplementation(project(mapOf("path" to ":presence_sdk")))
    ksp(AndroidX.room.compiler)
    androidTestImplementation(AndroidX.room.testing)

    implementation("com.facebook.android:facebook-login:_")
    implementation("com.facebook.android:facebook-applinks:_")
    implementation("com.facebook.android:facebook-share:_")
    implementation ("com.facebook.android:facebook-android-sdk:_")

    implementation(AndroidX.constraintLayout)
    implementation(AndroidX.recyclerView)
    implementation(AndroidX.viewPager2)
    implementation(AndroidX.annotation)
    implementation(AndroidX.core.ktx)
    implementation(AndroidX.exifInterface)
    implementation("com.google.android.material:material:_")

    implementation("androidx.credentials:credentials:_")
    // optional - needed for credentials support from play services, for devices running
    // Android 13 and below.

    implementation(Google.android.playServices.auth)
    implementation("com.google.android.gms:play-services-auth-api-phone:_")
    implementation(Google.android.playServices.location)
    implementation("com.google.android.gms:play-services-maps:_")
    implementation(Google.android.playServices.vision)
    implementation(Google.android.playServices.safetyNet)

    //libs for e-receipt
    implementation("com.google.apis:google-api-services-gmail:_") { exclude(module = "httpclient") }
    implementation("com.google.api-client:google-api-client-android:_") { exclude(module = "httpclient") }
    implementation("com.google.http-client:google-http-client-gson:_") { exclude(module = "httpclient") }
    implementation("com.google.zxing:core:_")
    implementation("androidx.localbroadcastmanager:localbroadcastmanager:_")

    implementation(Firebase.cloudMessaging)
    implementation(Firebase.analytics)
    implementation(Firebase.crashlytics)

    // Import the BoM for the Firebase platform
    implementation(platform(Firebase.bom))

    implementation("com.google.firebase:firebase-perf"){
        exclude(group = "com.google.firebase", module = "protolite-well-known-types")
    }
    implementation("com.google.code.findbugs:jsr305:_")
    implementation("com.google.guava:guava:_")

    implementation("com.github.chrisbanes:PhotoView:_")
    implementation("com.github.MasayukiSuda:EasingInterpolator:_")


    implementation("com.google.android.play:asset-delivery:_")
    implementation("com.google.android.play:feature-delivery:_")
    implementation("com.google.android.play:review:_")
    implementation("com.google.android.play:app-update:_")

    implementation("com.braze:android-sdk-ui:_")

    // AppsFlyer SDK integration (+ Google Play Install Referrer library)
    //make sure to use the latest SDK version: https://mvnrepository.com/artifact/com.appsflyer/af-android-sdk
    implementation("com.appsflyer:af-android-sdk:_")
    implementation("com.android.installreferrer:installreferrer:_")

    // Button SDK
    implementation("com.usebutton:android-sdk:_")

    // Sift SDK
    implementation("com.siftscience:sift-android:_")

    // webview sdk
    implementation(files("$projectDir/libs/webviewsdk.aar"))

    // Scandit
    implementation("com.scandit.datacapture:core:_")
    implementation("com.scandit.datacapture:barcode:_")

    // Retrofit
    implementation(Square.retrofit2.retrofit)
    implementation(Square.retrofit2.converter.gson)
    implementation(Square.okHttp3.okHttp)

    // Glide
    implementation("com.github.bumptech.glide:glide:_")
    implementation("com.github.bumptech.glide:okhttp3-integration:_")
    implementation("jp.wasabeef:glide-transformations:_")
    ksp("com.github.bumptech.glide:ksp:_")
    ksp("com.github.bumptech.glide:compiler:_")
    implementation("com.github.bumptech.glide:recyclerview-integration:_") {
        // Excludes the support library because it"s already included by Glide.
        isTransitive = false
    }

    // Blink receipt SDK
    implementation(platform("com.microblink.blinkreceipt:blinkreceipt-bom:_"))
    implementation("com.microblink.blinkreceipt:blinkreceipt-recognizer")
    implementation("com.microblink.blinkreceipt:blinkreceipt-account-linking")
    implementation(JakeWharton.timber)
//    // updating to 4.7.1 causes viewbinding errors
    implementation(Square.retrofit2.converter.scalars)
    implementation(Square.okio)
    implementation(Google.android.playServices.tasks)

    implementation(AndroidX.security.crypto)
    implementation("com.sun.mail:android-mail:_")
    implementation("com.sun.mail:android-activation:_")
    implementation(AndroidX.webkit)

    implementation(AndroidX.fragment.ktx)


    // Set the dependency to run PowerMockito and Mockito tests
    testImplementation(Testing.junit4)

    testImplementation("org.javassist:javassist:_")

    testImplementation("org.mockito:mockito-core:_")
    testImplementation("org.mockito.kotlin:mockito-kotlin:_")

    testImplementation("io.mockk:mockk:_")
    testImplementation(AndroidX.archCore.testing)
    testImplementation("org.json:json:_")
    testImplementation(group = "uk.co.datumedge", name = "hamcrest-json", version = "0.2")

    // Apache http component for test case dependency.
    androidTestImplementation("org.apache.httpcomponents:httpclient:_")

    //ANR watch dog
    implementation("com.github.anrwatchdog:anrwatchdog:_")

    //Espresso
    androidTestImplementation("androidx.test.espresso:espresso-core:_")
    androidTestImplementation("androidx.test.espresso:espresso-intents:_")
    androidTestImplementation("androidx.test.espresso:espresso-contrib:_") {
        exclude(group = "androidx.appcompat", module = "appcompat")
        exclude(group = "com.google.android.material", module = "material")
        exclude(group = "androidx.recyclerview", module = "recyclerview")
    }
    androidTestImplementation(AndroidX.test.runner)
    androidTestImplementation(Testing.junit4)

    // Set this dependency to use JUnit 4 rules
    androidTestImplementation(AndroidX.test.rules)

    //stringutils support
    androidTestImplementation("org.apache.commons:commons-lang3:_")

    //json reports support

    //implementation(group = "org.apache.logging.log4j", name = "log4j-core", version = "2.7")
    androidTestImplementation("com.googlecode.json-simple:json-simple:_")

    implementation(AndroidX.lifecycle.viewModelKtx)
    implementation(AndroidX.work.runtimeKtx)

    // Confetti to implement particle animation on New Kicks bubble
    // https://github.com/jinatonic/confetti
    implementation("com.github.jinatonic.confetti:confetti:_")

    // Custom date/time picker for FTUE reminder
    // https://github.com/wdullaer/MaterialDateTimePicker#license
    implementation("com.wdullaer:materialdatetimepicker:_")

    //Lottie
    implementation("com.airbnb.android:lottie:_")

    //coroutines
    implementation(KotlinX.coroutines.core)
    implementation(KotlinX.coroutines.playServices)

    //Test
    testImplementation(KotlinX.coroutines.core)
    testImplementation(KotlinX.coroutines.test)

    implementation("com.newrelic.agent.android:android-agent:_")


    // Add this to install the NewRelicVideoCore (required)
    implementation("com.github.newrelic.video-agent-android:NewRelicVideoCore:_")
    // Add this to install the ExoPlayer tracker
    implementation("com.github.newrelic.video-agent-android:NRExoPlayerTracker:_")
    // Add this to install the Google IMA library tracker
    implementation("com.github.newrelic.video-agent-android:NRIMATracker:_")


    //exoplayer new androidx
    implementation("androidx.media3:media3-exoplayer:_")
    implementation("androidx.media3:media3-exoplayer-dash:_")
    implementation("androidx.media3:media3-ui:_")
    implementation("androidx.media3:media3-exoplayer-ima:_")




    //Hilt+Dagger
    implementation(Google.dagger.hilt.android)
    implementation("androidx.hilt:hilt-work:_")
    kapt(Google.dagger.hilt.compiler)
    androidTestImplementation(Google.dagger.hilt.android.testing)
    kaptAndroidTest(Google.dagger.hilt.compiler)
    testImplementation(Google.dagger.hilt.android.testing)
    kaptTest(Google.dagger.hilt.compiler)
    implementation("androidx.hilt:hilt-navigation-compose:_")

    //Test
    testImplementation(KotlinX.coroutines.core)
    testImplementation(KotlinX.coroutines.test)

    implementation ("com.android.installreferrer:installreferrer:_")

    implementation(AndroidX.core.splashscreen)

    //foursquare
    implementation("com.foursquare:movementsdk:_")

    //Chucker
    debugImplementation("com.github.chuckerteam.chucker:library:_")
    releaseImplementation("com.github.chuckerteam.chucker:library-no-op:_")

    implementation("androidx.profileinstaller:profileinstaller:_")

    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:_")
}

// annotations support
configurations.all {
    exclude(group = "org.apache.httpcomponents", module = "httpclient")
    exclude(group = "org.apache.httpcomponents", module = "httpcore")
    exclude(group = "com.google.guava", module = "listenablefuture")
    resolutionStrategy {
        force("androidx.legacy:legacy-support-v4:1.0.0")
        force("androidx.browser:browser:1.0.0")
        force("androidx.cardview:cardview:1.0.0")
        force("androidx.legacy:legacy-support-core-utils:1.0.0")
    }
}


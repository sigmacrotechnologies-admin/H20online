import React, { useEffect, useRef } from "react";

import { View, StyleSheet } from "react-native";

import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

import SafeMapBoundary from "@/src/components/SafeMapBoundary";

import GoogleStaticMapPreview from "@/src/components/GoogleStaticMapPreview";

import { theme } from "@/src/theme";

import { shouldUseNativeGoogleMaps, shouldUseWebMapsFallback } from "@/src/utils/mapRuntime";



const DELTA = 0.08;



export default function RouteMapPreview({

  fromLatitude,

  fromLongitude,

  toLatitude,

  toLongitude,

  height = 180,

}) {

  const mapRef = useRef(null);

  const hasFrom = Number.isFinite(fromLatitude) && Number.isFinite(fromLongitude);

  const hasTo = Number.isFinite(toLatitude) && Number.isFinite(toLongitude);



  useEffect(() => {

    if (!mapRef.current || !hasFrom || !hasTo) return;

    mapRef.current.fitToCoordinates(

      [

        { latitude: fromLatitude, longitude: fromLongitude },

        { latitude: toLatitude, longitude: toLongitude },

      ],

      { edgePadding: { top: 40, right: 40, bottom: 40, left: 40 }, animated: true }

    );

  }, [fromLatitude, fromLongitude, toLatitude, toLongitude, hasFrom, hasTo]);



  if (!hasFrom || !hasTo) return null;



  if (shouldUseWebMapsFallback()) {

    return (

      <SafeMapBoundary>

        <GoogleStaticMapPreview

          fromLatitude={fromLatitude}

          fromLongitude={fromLongitude}

          toLatitude={toLatitude}

          toLongitude={toLongitude}

          height={height}

        />

      </SafeMapBoundary>

    );

  }



  const centerLat = (fromLatitude + toLatitude) / 2;

  const centerLng = (fromLongitude + toLongitude) / 2;



  return (

    <SafeMapBoundary>

      <View style={[styles.wrap, { height }]}>

        <MapView

          ref={mapRef}

          style={styles.map}

          provider={shouldUseNativeGoogleMaps() ? PROVIDER_GOOGLE : undefined}

          initialRegion={{

            latitude: centerLat,

            longitude: centerLng,

            latitudeDelta: DELTA,

            longitudeDelta: DELTA,

          }}

        >

          <Marker coordinate={{ latitude: fromLatitude, longitude: fromLongitude }} pinColor="#1E8FB1" />

          <Marker coordinate={{ latitude: toLatitude, longitude: toLongitude }} pinColor="#EF4444" />

        </MapView>

      </View>

    </SafeMapBoundary>

  );

}



const styles = StyleSheet.create({

  wrap: {

    borderRadius: 14,

    overflow: "hidden",

    borderWidth: 1,

    borderColor: theme.border,

  },

  map: { width: "100%", height: "100%" },

});



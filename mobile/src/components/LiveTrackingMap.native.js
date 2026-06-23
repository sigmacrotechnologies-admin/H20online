import React, { useEffect, useRef } from "react";

import { View, StyleSheet } from "react-native";

import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

import SafeMapBoundary from "@/src/components/SafeMapBoundary";

import GoogleStaticMapPreview from "@/src/components/GoogleStaticMapPreview";

import { theme } from "@/src/theme";

import { shouldUseNativeGoogleMaps, shouldUseWebMapsFallback } from "@/src/utils/mapRuntime";



const DELTA = 0.06;



function LiveTrackingMapInner({

  customerLatitude,

  customerLongitude,

  partnerLatitude,

  partnerLongitude,

  storeLatitude,

  storeLongitude,

  height = 200,

}) {

  const mapRef = useRef(null);

  const hasCustomer = Number.isFinite(customerLatitude) && Number.isFinite(customerLongitude);

  const hasPartner = Number.isFinite(partnerLatitude) && Number.isFinite(partnerLongitude);

  const hasStore = Number.isFinite(storeLatitude) && Number.isFinite(storeLongitude);



  const points = [];

  if (hasCustomer) points.push({ latitude: customerLatitude, longitude: customerLongitude });

  if (hasPartner) points.push({ latitude: partnerLatitude, longitude: partnerLongitude });

  if (hasStore) points.push({ latitude: storeLatitude, longitude: storeLongitude });



  useEffect(() => {

    if (!mapRef.current || points.length < 2) return;

    mapRef.current.fitToCoordinates(points, {

      edgePadding: { top: 48, right: 48, bottom: 48, left: 48 },

      animated: true,

    });

  }, [customerLatitude, customerLongitude, partnerLatitude, partnerLongitude, storeLatitude, storeLongitude]);



  if (!hasCustomer || (!hasPartner && !hasStore)) return null;



  if (shouldUseWebMapsFallback()) {

    return (

      <GoogleStaticMapPreview

        fromLatitude={customerLatitude}

        fromLongitude={customerLongitude}

        toLatitude={hasStore ? storeLatitude : partnerLatitude}

        toLongitude={hasStore ? storeLongitude : partnerLongitude}

        partnerLatitude={hasPartner ? partnerLatitude : undefined}

        partnerLongitude={hasPartner ? partnerLongitude : undefined}

        height={height}

      />

    );

  }



  const center = points[0];



  return (

    <View style={[styles.wrap, { height }]}>

      <MapView

        ref={mapRef}

        style={styles.map}

        provider={shouldUseNativeGoogleMaps() ? PROVIDER_GOOGLE : undefined}

        initialRegion={{

          latitude: center.latitude,

          longitude: center.longitude,

          latitudeDelta: DELTA,

          longitudeDelta: DELTA,

        }}

      >

        {hasCustomer ? (

          <Marker coordinate={{ latitude: customerLatitude, longitude: customerLongitude }} pinColor="#1E8FB1" />

        ) : null}

        {hasStore ? (

          <Marker coordinate={{ latitude: storeLatitude, longitude: storeLongitude }} pinColor="#F59E0B" />

        ) : null}

        {hasPartner ? (

          <Marker coordinate={{ latitude: partnerLatitude, longitude: partnerLongitude }} pinColor="#10B981" />

        ) : null}

      </MapView>

    </View>

  );

}



export default function LiveTrackingMap(props) {

  return (

    <SafeMapBoundary>

      <LiveTrackingMapInner {...props} />

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



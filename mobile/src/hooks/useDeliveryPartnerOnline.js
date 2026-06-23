import { useCallback, useEffect, useState } from "react";

import { useFocusEffect } from "expo-router";

import * as Location from "expo-location";

import { api } from "@/src/api/client";



const LOCATION_INTERVAL_MS = 15000;



async function readCoords() {

  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status !== "granted") return null;

  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });

  return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };

}



/**

 * Delivery partner online toggle + background location while online.

 */

export function useDeliveryPartnerOnline() {

  const [isOnline, setIsOnline] = useState(false);

  const [inFlight, setInFlight] = useState(false);

  const [activeDeliveryOrderId, setActiveDeliveryOrderId] = useState(null);

  const [loading, setLoading] = useState(true);

  const [toggling, setToggling] = useState(false);



  const refresh = useCallback(() => {

    return api.deliveryPartners

      .me()

      .then((p) => {

        setIsOnline(Boolean(p?.isOnline));

        setInFlight(Boolean(p?.inFlight));

        setActiveDeliveryOrderId(p?.activeDeliveryOrderId || null);

      })

      .catch(() => {

        setIsOnline(false);

        setInFlight(false);

        setActiveDeliveryOrderId(null);

      });

  }, []);



  useFocusEffect(

    useCallback(() => {

      setLoading(true);

      refresh().finally(() => setLoading(false));

    }, [refresh])

  );



  useEffect(() => {

    if (!isOnline) return undefined;

    let stopped = false;



    const push = async () => {

      try {

        const coords = await readCoords();

        if (!coords || stopped) return;

        await api.deliveryPartners.updateAvailabilityLocation(coords);

      } catch {

        // ignore transient failures

      }

    };



    push();

    const timer = setInterval(push, LOCATION_INTERVAL_MS);

    return () => {

      stopped = true;

      clearInterval(timer);

    };

  }, [isOnline]);



  const setOnline = async (value) => {

    setToggling(true);

    try {

      let body = { isOnline: value };

      if (value) {

        const coords = await readCoords();

        if (!coords) {

          throw new Error("Location permission is required to go online.");

        }

        body = { ...body, ...coords };

      }

      await api.deliveryPartners.setOnline(body);

      setIsOnline(value);

      await refresh();

    } finally {

      setToggling(false);

    }

  };



  return {

    isOnline,

    inFlight,

    activeDeliveryOrderId,

    setOnline,

    loading,

    toggling,

    refresh,

  };

}


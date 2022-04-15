import {
  addHours,
  eachHourOfInterval,
  isSameDay,
  isSameHour,
  endOfTomorrow,
  isWithinInterval,
  parseISO,
  startOfToday,
} from "date-fns";
import Head from "next/head";
import { useCallback, useEffect, useMemo, useState } from "react";
import { round, debounce, meanBy, min } from "lodash";
import InputElement from "../components/InputElement";
import { useRouter } from "next/router";

const Home = ({ prices }: { prices: any }) => {
  const router = useRouter();
  const [petrol, setPetrol] = useState(14.5);
  const [batterySize, setBatterySize] = useState(10);
  const [electricDistance, setElectricDistance] = useState(30);
  const [liter, setLiter] = useState(11.6);
  const [chargeHours, setChargeHours] = useState(8);
  const [isSaving, setIsSaving] = useState(false);
  const today = prices.find((p: any) =>
    isSameHour(parseISO(p.time), new Date())
  );
  const meanPrices = eachHourOfInterval({
    start: startOfToday(),
    end: endOfTomorrow(),
  }).map((d) => ({
    start: d,
    end: addHours(d, chargeHours || 1),
    price: round(
      meanBy(
        prices.filter((p: any) =>
          isWithinInterval(parseISO(p.time), {
            start: d,
            end: addHours(d, chargeHours || 1),
          })
        ),
        (p: any) => p.price
      ),
      2
    ),
  }));
  const kmkwh = electricDistance / batterySize;
  const electricPrice = round(today.price / kmkwh, 2);
  const petrolPrice = round(petrol / liter, 2);
  const shouldCharge = electricPrice <= petrolPrice;
  const settings = useMemo(
    () => ({
      petrol,
      batterySize,
      electricDistance,
      liter,
      chargeHours,
    }),
    [petrol, batterySize, electricDistance, liter, chargeHours]
  );

  const saveSettings = useCallback(() => {
    localStorage.setItem("settings", JSON.stringify(settings));
    setIsSaving(false);
  }, [settings]);
  const debouncedSaveSettings = useCallback(debounce(saveSettings, 2000), [
    saveSettings,
  ]);

  const restoreSettings = () => {
    const savedSettings = localStorage.getItem("settings");
    if (!savedSettings) return;
    const settings = JSON.parse(savedSettings);
    setPetrol(settings.petrol);
    setBatterySize(settings.batterySize);
    setElectricDistance(settings.electricDistance);
    setLiter(settings.liter);
    setChargeHours(settings.chargeHours);
  };

  const handleChange = (e: any, callback: Function) => {
    setIsSaving(true);
    callback(e.target.valueAsNumber);
  };

  useEffect(() => {
    debouncedSaveSettings();
  }, [settings, debouncedSaveSettings]);

  useEffect(() => {
    restoreSettings();
  }, []);

  return (
    <div>
      <Head>
        <title>Elpris</title>
        <meta name="description" content="Elpriser for plugin hybrid" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="max-w-xl m-auto text-center my-2">
        <p className="text-2xl font-bold">
          Spotpris: {today.price.toFixed(2)} kr/kwh
        </p>
        <div className="grid grid-cols-2">
          <InputElement
            value={petrol}
            onChange={(e) => handleChange(e, setPetrol)}
            label="Petrol price"
          />
          <InputElement
            value={liter}
            onChange={(e) => handleChange(e, setLiter)}
            label="Km/Liter"
          />
          <InputElement
            value={batterySize}
            onChange={(e) => handleChange(e, setBatterySize)}
            label="Battery size"
          />
          <InputElement
            value={electricDistance}
            onChange={(e) => handleChange(e, setElectricDistance)}
            label="Electric distance"
          />
          <InputElement
            value={chargeHours}
            onChange={(e) => handleChange(e, setChargeHours)}
            label="Charging hours"
          />
        </div>
        <p className="text-xl font-bold my-2">Km/Kwh: {round(kmkwh)}</p>
        <div>
          {shouldCharge ? (
            <p className="py-2 text-xl font-bold text-white bg-green-600 my-2">
              Charge!
            </p>
          ) : (
            <p className="py-2 text-xl font-bold text-white bg-red-600 my-2">
              Do not charge!
            </p>
          )}
        </div>
        <div className="border my-2">
          <p className="text-xl font-bold">Elpris: {electricPrice} kr/km</p>
          <p className="text-xl font-bold">Benzinpris: {petrolPrice} kr/km</p>
        </div>
        <table className="w-full border-y border-gray-400">
          <thead>
            <th>Start</th>
            <th>End</th>
            <th>Mean price</th>
          </thead>
          <tbody>
            {meanPrices.map((p, i, a) => {
              const isLowestPrice =
                p.price ===
                min(
                  a
                    .filter((a) => isSameDay(p.start, a.start))
                    .map((a) => a.price)
                );
              const priceIsTooDamnMuch = p.price / kmkwh > petrolPrice;

              return (
                <tr
                  key={p.start.toISOString()}
                  className={`border-t border-gray-400 ${
                    isLowestPrice ? "bg-green-300 font-bold" : ""
                  } ${priceIsTooDamnMuch ? "bg-red-500" : ""}`}
                >
                  <td
                    className="hover:underline cursor-pointer"
                    onClick={() =>
                      router.push("/time/" + p.start.toISOString())
                    }
                  >
                    {p.start.toLocaleString()}
                  </td>
                  <td>{p.end.toLocaleTimeString()}</td>
                  <td>{p.price.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </main>
    </div>
  );
};

export default Home;

export const getStaticProps = async () => {
  const data = await fetch(
    "https://api.energidataservice.dk/datastore_search?resource_id=elspotprices&sort=HourDK%20desc&filters={%22PriceArea%22:%22DK1%22}"
  ).then((res) => res.json());
  const prices = data.result.records.map((r: any) => ({
    ...r,
    time: new Date(r.HourUTC),
    price: round(((r.SpotPriceDKK || r.SpotPriceEUR * 7.44) / 1000) * 2, 2),
  }));

  return {
    props: {
      prices: JSON.parse(JSON.stringify(prices)),
    },
    revalidate: 60,
  };
};

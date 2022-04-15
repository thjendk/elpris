import {
  isWithinInterval,
  parseISO,
  addHours,
  differenceInHours,
  subHours,
  eachHourOfInterval,
  startOfToday,
} from "date-fns";
import { meanBy, round, min } from "lodash";
import { useRouter } from "next/router";
import { useState } from "react";
import InputElement from "../../components/InputElement";

const Time = ({ prices }: { prices: any }) => {
  const [hours, setHours] = useState(8);
  const router = useRouter();
  const { time }: any = router.query;
  const now = parseISO(time);
  const meanPrices = [...Array(hours || 1)].map((d, i) => {
    const start = now;
    const end = addHours(start, i + 1);

    return {
      start,
      end,
      price: round(
        meanBy(
          prices.filter((p: any) =>
            isWithinInterval(parseISO(p.time), {
              start,
              end,
            })
          ),
          (p: any) => p.price
        ),
        2
      ),
    };
  });

  return (
    <div className="max-w-xl m-auto my-2 text-center">
      <InputElement
        value={hours}
        onChange={(e) => setHours(e.target.valueAsNumber)}
        label="Hours"
      />
      <button
        onClick={() => router.push("/")}
        className="w-full border border-gray-400 rounded p-1 hover:underline"
      >
        Home
      </button>
      <div className="grid grid-cols-2">
        <button
          onClick={() => router.push("/time/" + subHours(now, 1).toISOString())}
          className="border border-gray-400 rounded p-1 my-1 hover:underline"
        >
          Previous
        </button>
        <button
          onClick={() => router.push("/time/" + addHours(now, 1).toISOString())}
          className="border border-gray-400 rounded p-1 m-1 hover:underline"
        >
          Next
        </button>
      </div>
      <table className="w-full border-y border-gray-400">
        <thead>
          <th>Start</th>
          <th>End</th>
          <th>Hours</th>
          <th>Mean price</th>
        </thead>
        <tbody>
          {meanPrices.map((p, i, a) => {
            const isLowestPrice = p.price === min(a.map((a) => a.price));

            return (
              <tr
                key={p.end.toISOString()}
                className={`border-t border-gray-400 ${
                  isLowestPrice ? "bg-green-300 font-bold" : ""
                }`}
              >
                <td>{p.start.toLocaleString()}</td>
                <td>{p.end.toLocaleTimeString()}</td>
                <td>{differenceInHours(p.end, p.start)}</td>
                <td>{p.price.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default Time;

export const getStaticPaths = async () => {
  const hours = eachHourOfInterval({
    start: startOfToday(),
    end: addHours(startOfToday(), 24),
  });
  const paths = hours.map((h) => ({
    params: { time: h.toISOString() },
  }));

  return { paths, fallback: "blocking" };
};

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

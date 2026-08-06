import { Kline } from "../utils/orderbookService/types";

// This function aims to provide a timestamp that represents the same point in time as the input ISO date string
// but without accounting for any time zone offset.
// This is useful for us because we want to work with timestamps that should be consistent across different time zones.
export const getCorrectTimestamp = (ISOdate: string) => {
  const date = new Date(ISOdate);

  const timestampWithOffset = date.getTime();

  const offset = date.getTimezoneOffset() * 60 * 1000;
  const timestampWithoutOffset = timestampWithOffset - offset;
  return timestampWithoutOffset;
};

export const processKlineData = (data: Kline[]) => {
  const klinesData = data.map((x) => ({
    time: getCorrectTimestamp(x.timestamp.toISOString()),
    open: Number(x.open),
    high: Number(x.high),
    low: Number(x.low),
    close: Number(x.close),
    volume: Number(x.baseVolume),
  }));
  // if volume is 0, take previous close as candle
  klinesData?.forEach((elem, idx) => {
    if (idx === 0) {
      return;
    }
    if (!elem.volume) {
      elem.low = klinesData[idx - 1].close;
      elem.high = klinesData[idx - 1].close;
      elem.close = klinesData[idx - 1].close;
      elem.open = klinesData[idx - 1].close;
      elem.volume = 0;
    }
  });
  return klinesData;
};

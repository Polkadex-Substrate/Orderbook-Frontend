export const mapValues = (maxVolume?: number, data?: number[]) =>
  data && maxVolume && !!data.length
    ? data.map((currentVolume) => {
        return { value: (currentVolume / maxVolume) * 100 };
      })
    : [];

export const calcMaxVolume = (bids: string[][], asks: string[][]) => {
  return Math.max(...accumulateVolume(bids), ...accumulateVolume(asks));
};

// This function takes a 2D array e.g. [[a, b] ,[c, d], [e, f], .......]
// and returns a 1D array which looks like this [ab, ab + cd, ab + cd + ef, .........].
export const accumulateVolume = (array: string[][]) => {
  const total: number[] = [];
  array
    .map((item) => {
      return Number(item[0]) * Number(item[1]);
    })
    .reduce((accumulator, currentValue, currentIndex) => {
      total[currentIndex] = Number(accumulator) + Number(currentValue);

      return Number(accumulator) + Number(currentValue);
    }, 0);

  return total;
};

// The function merges duplicate orders by accumulating the quantities for each unique order price
// e.g. [[1,2], [2,3], [1,5], [1,3.4], [2,4], [3,5]]
// and returns [[1, 10.4], [2, 7], [3, 5]];
export const mergeDuplicateOrders = (orders: number[][]): string[][] => {
  const res = Object.entries(
    orders.reduce(
      (acc, [key, value]) => {
        acc[key] = (acc[key] || 0) + value;
        return acc;
      },
      {} as Record<number, number>
    )
  ).map(([key, value]) => [key, value] as string[]);
  return res;
};

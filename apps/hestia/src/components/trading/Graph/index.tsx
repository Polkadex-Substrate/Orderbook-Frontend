// TODO: Replace expand and screenshot button style

"use client";

// import dynamic from "next/dynamic";
// import Script from "next/script";
// import { Tabs } from "@polkadex/ux";

// import { Header } from "./header";
// import { useTradingView } from "./useTradingView";

// const TVChartContainer = dynamic(
//   () => import("./tradingView").then((mod) => mod.TVChartContainer),
//   { ssr: false }
// );

// export const Graph = ({ id }: { id: string }) => {
//   const {
//     activeResolution,
//     onChangeResolution,
//     tvWidget,
//     widgetOptions,
//     onChartReady,
//     isChartReady,
//     onChangeFullScreen,
//     onScreenshot,
//   } = useTradingView({ id });

//   return (
//     <>
//       <Script src="/datafeeds/udf/dist/bundle.js" strategy="lazyOnload" />
//       <Tabs defaultValue="tradingView" className="flex flex-1">
//         <div className="flex flex-1 flex-col h-full">
//           <Header
//             activeResolution={activeResolution}
//             onChangeResolution={onChangeResolution}
//             onChangeFullScreen={onChangeFullScreen}
//             onScreenshot={onScreenshot}
//           />
//           <Tabs.Content
//             value="tradingView"
//             className="flex flex-col h-full flex-1"
//           >
//             <TVChartContainer
//               tvWidget={tvWidget}
//               widgetOptions={widgetOptions}
//               isChartReady={isChartReady}
//               onChartReady={onChartReady}
//               id={id}
//             />
//           </Tabs.Content>
//         </div>
//       </Tabs>
//     </>
//   );
// };

import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import { Market } from "@orderbook/core/utils/orderbookService";

export const Graph = ({ currentMarket }: { currentMarket?: Market }) => {
  // Configuration
  const SERVER_BASE_URL = process.env.NEXT_PUBLIC_SERVER_BASE_URL;
  const GATEWAY_SECRET = process.env.NEXT_PUBLIC_GATEWAY_SECRET;

  const firstAsset = currentMarket?.name?.split('/')[0];
  const secondAsset = currentMarket?.name?.split('/')[1];

  // State
  const [selectedPair, setSelectedPair] = useState(firstAsset + '-' + secondAsset);
  const [statusBadge, setStatusBadge] = useState({
    text: 'Checking Server Status...',
    className: 'px-3 py-1 rounded-full text-xs font-medium bg-blue-900 text-blue-300'
  });
  const [lastUpdate, setLastUpdate] = useState('--:--:--');
  const [isLoading, setIsLoading] = useState(false);
  const [isChartReady, setIsChartReady] = useState(false);
  const [isChartError, setIsChartError] = useState(false);
  
  // Ticker state
  const [tickerData, setTickerData] = useState({
    price: '---',
    change: '---',
    changeClass: 'text-xl font-mono text-gray-400',
    high: '---',
    low: '---'
  });

  // Legend state
  const [legendData, setLegendData] = useState({
    symbol: '---',
    ohlc: 'O: -- H: -- L: -- C: --',
    volume: 'V: --'
  });

  // Refs
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candlestickSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const tickerIntervalRef = useRef<any>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Initialize Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    let chart: any = null;
    let candlestickSeries: any = null;
    let volumeSeries: any = null;

    const initChart = () => {
      if (!chartContainerRef.current) return;

      const containerWidth = chartContainerRef.current.clientWidth;
      const containerHeight = chartContainerRef.current.clientHeight;

      if (containerWidth === 0 || containerHeight === 0) {
        console.warn('Container dimensions are 0, retrying...');
        setTimeout(initChart, 100);
        return;
      }

      chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: '#0d0d0f' },
          textColor: '#d1d4dc',
        },
        grid: {
          vertLines: { color: '#2B2B43' },
          horzLines: { color: '#2B2B43' },
        },
        crosshair: {
          mode: 1, // CrosshairMode.Magnet
          vertLine: {
            labelBackgroundColor: '#0d0d0f',
          },
          horzLine: {
            labelBackgroundColor: '#0d0d0f',
          },
        },
        rightPriceScale: {
          borderColor: '#2B2B43',
          autoScale: true,
          entireTextOnly: true,
        },
        timeScale: {
          borderColor: '#2B2B43',
          timeVisible: true,
          secondsVisible: false,
          shiftVisibleRangeOnNewBar: true,
          rightOffset: 12,
        },
        handleScroll: {
          mouseWheel: true,
          pressedMouseMove: true,
          horzTouchDrag: true,
          vertTouchDrag: true,
        },
        handleScale: {
          axisPressedMouseMove: true,
          mouseWheel: true,
          pinch: true,
        },
        kineticScroll: {
          touch: true,
          mouse: true,
        },
        watermark: {
          visible: true,
          fontSize: 48,
          horzAlign: 'center',
          vertAlign: 'center',
          color: 'rgba(171, 192, 227, 0.05)',
          text: 'PDEX/USDT',
        },
        localization: {
          locale: 'en-US',
        },
        width: containerWidth,
        height: containerHeight,
      });

      // Add Candlestick Series
      candlestickSeries = chart.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
        priceLineVisible: true,
        lastValueVisible: true,
      });

      // Add Volume Series
      volumeSeries = chart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '',
      });

      volumeSeries.priceScale().applyOptions({
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });

      chartRef.current = chart;
      candlestickSeriesRef.current = candlestickSeries;
      volumeSeriesRef.current = volumeSeries;

      // Crosshair Move Handler for Legend
      chart.subscribeCrosshairMove(param => {
        if (param.time && param.seriesData.get(candlestickSeries)) {
          const data = param.seriesData.get(candlestickSeries);
          const volume = param.seriesData.get(volumeSeries);

          const precision = candlestickSeries.options().priceFormat.precision || 2;

          setLegendData(prev => ({
            symbol: prev.symbol,
            ohlc: `O: ${data.open.toFixed(precision)} H: ${data.high.toFixed(precision)} L: ${data.low.toFixed(precision)} C: ${data.close.toFixed(precision)}`,
            volume: `V: ${volume ? volume.value.toLocaleString() : '0'}`
          }));
        } else {
          setLegendData(prev => ({
            ...prev,
            ohlc: 'O: -- H: -- L: -- C: --',
            volume: 'V: --'
          }));
        }
      });

      // Setup ResizeObserver for better resize handling
      resizeObserverRef.current = new ResizeObserver(entries => {
        if (entries.length === 0 || !entries[0].target) return;
        const newWidth = entries[0].contentRect.width;
        const newHeight = entries[0].contentRect.height;
        if (chart && newWidth > 0 && newHeight > 0) {
          chart.applyOptions({ width: newWidth, height: newHeight });
        }
      });

      if (chartContainerRef.current) {
        resizeObserverRef.current.observe(chartContainerRef.current);
      }

      setIsChartReady(true);
    };

    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      initChart();
    });

    // Cleanup
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      if (chart) {
        chart.remove();
      }
      if (tickerIntervalRef.current) {
        clearInterval(tickerIntervalRef.current);
      }
    };
  }, []);

  // Fetch Ticker Data
  const fetchTickerData = async (pair) => {
    const [symbol, quote] = pair.split('-');

    try {
      const url = `${SERVER_BASE_URL}/gateway/ticker?symbols=${symbol.toUpperCase()}&vs_currency=${quote}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Ticker fetch failed');

      const { data } = await response.json();
      if (!data || data.length === 0) {
        throw new Error('No ticker data received');
      }

      const ticker = data[0];
      const price = parseFloat(ticker.price);
      const changePercent = parseFloat(ticker.changePercent24h);
      const high = parseFloat(ticker.high24h);
      const low = parseFloat(ticker.low24h);

      const sign = changePercent >= 0 ? '+' : '';
      
      setTickerData({
        price: `$${price.toLocaleString(undefined, { minimumFractionDigits: 5, maximumFractionDigits: 5 })}`,
        change: `${sign}${changePercent.toFixed(2)}%`,
        changeClass: `text-xl font-mono ${changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`,
        high: `$${high.toLocaleString(undefined, { minimumFractionDigits: 5, maximumFractionDigits: 5 })}`,
        low: `$${low.toLocaleString(undefined, { minimumFractionDigits: 5, maximumFractionDigits: 5 })}`
      });

      // Update Page Title
      document.title = `${symbol.toUpperCase()}/${quote.toUpperCase()} $${price.toLocaleString(undefined, { minimumFractionDigits: 5, maximumFractionDigits: 5 })} (${sign}${changePercent.toFixed(2)}%)`;

    } catch (error) {
      console.error('Error fetching ticker:', error);
      setTickerData({
        price: '---',
        change: '---',
        changeClass: 'text-xl font-mono text-gray-400',
        high: '---',
        low: '---'
      });
    }
  };

  // Generate Mock Data
  const generateMockData = (symbol) => {
    const candleData: any[] = [];
    const volumeData: any[] = [];
    let time = Math.floor(Date.now() / 1000) - (100 * 24 * 60 * 60);

    // Set base price based on asset
    let lastClose = 45000; // BTC
    let volatility = 1000;
    let avgVol = 50000;

    if (symbol === 'eth') { lastClose = 2500; volatility = 100; avgVol = 150000; }
    else if (symbol === 'sol') { lastClose = 100; volatility = 5; avgVol = 1000000; }
    else if (symbol === 'pdex') { lastClose = 0.5; volatility = 0.05; avgVol = 200000; }

    // Adjust precision for pdex
    const precision = symbol === 'pdex' ? 4 : 2;
    if (candlestickSeriesRef.current) {
      candlestickSeriesRef.current.applyOptions({
        priceFormat: {
          precision: precision,
          minMove: 1 / Math.pow(10, precision),
        }
      });
    }

    for (let i = 0; i < 100; i++) {
      const open = lastClose + (Math.random() - 0.5) * volatility;
      const high = open + Math.random() * (volatility / 2);
      const low = open - Math.random() * (volatility / 2);
      const close = (high + low) / 2;
      const volume = avgVol * (Math.random() + 0.5);

      candleData.push({ time, open, high, low, close });
      volumeData.push({
        time,
        value: volume,
        color: close >= open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)'
      });

      time += 24 * 60 * 60;
      lastClose = close;
    }

    if (candlestickSeriesRef.current && volumeSeriesRef.current) {
      candlestickSeriesRef.current.setData(candleData);
      volumeSeriesRef.current.setData(volumeData);

      // Add sample markers
      const markers = [
        { time: candleData[20].time, position: 'belowBar', color: '#2196F3', shape: 'arrowUp', text: 'Buy @ ' + candleData[20].low.toFixed(precision) },
        { time: candleData[50].time, position: 'aboveBar', color: '#e91e63', shape: 'arrowDown', text: 'Sell @ ' + candleData[50].high.toFixed(precision) },
        { time: candleData[80].time, position: 'belowBar', color: '#ff9800', shape: 'circle', text: 'Signal' },
      ];
      candlestickSeriesRef.current.setMarkers(markers);
    }

    setLastUpdate(`Simulated: ${new Date().toLocaleTimeString()}`);
  };

  // Fetch Chart Data
  const fetchChartData = async (pair) => {
    const [symbol, quote] = pair.split('-');

    // Update Watermark
    if (chartRef.current) {
      chartRef.current.applyOptions({
        watermark: {
          text: `${symbol.toUpperCase()}/${quote.toUpperCase()}`,
        },
      });
    }
    
    setLegendData(prev => ({
      ...prev,
      symbol: `${symbol.toUpperCase()}/${quote.toUpperCase()}`
    }));

    // Fetch Ticker Data in parallel
    fetchTickerData(pair);

    try {
      setIsLoading(true);
      setStatusBadge({
        text: 'Connecting...',
        className: 'px-3 py-1 rounded-full text-xs font-medium bg-blue-900 text-blue-300'
      });

      const to = Math.floor(Date.now() / 1000);
      const from = to - (180 * 24 * 60 * 60);

      const url = `${SERVER_BASE_URL}/gateway/history?symbol=${symbol}&vs_currency=${quote}&resolution=1d&from=${from}&to=${to}`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'X-Gateway-Secret': GATEWAY_SECRET || ''
        }
      });

      if (!response.ok) throw new Error('Server response error');

      const data = await response.json();

      if (data.s !== 'ok') {
        throw new Error(data.errmsg || 'No data available');
      }

      const candleData: any[] = [];
      const volumeData: any[] = [];

      data.t.forEach((timestamp, i) => {
        candleData.push({
          time: timestamp,
          open: data.o[i],
          high: data.h[i],
          low: data.l[i],
          close: data.c[i]
        });

        volumeData.push({
          time: timestamp,
          value: data.v[i],
          color: data.c[i] >= data.o[i] ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)'
        });
      });

      if (candlestickSeriesRef.current && volumeSeriesRef.current) {
        candlestickSeriesRef.current.setData(candleData);
        volumeSeriesRef.current.setData(volumeData);
      }

      setLastUpdate(new Date().toLocaleTimeString());

      setStatusBadge({
        text: 'Server Connected',
        className: 'px-3 py-1 rounded-full text-xs font-medium bg-green-900 text-green-300'
      });

    } catch (error) {
      console.warn('Server connection failed. Falling back to mock data.', error);

      setStatusBadge({
        text: 'Server Not Detected (Mock Data)',
        className: 'px-3 py-1 rounded-full text-xs font-medium bg-yellow-900 text-yellow-300'
      });
      setIsChartError(true);

      // generateMockData(symbol);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data when pair changes and chart is ready
  useEffect(() => {
    if (isChartReady && chartRef.current) {
      fetchChartData(selectedPair);
      
      // Reset and set new ticker interval
      if (tickerIntervalRef.current) {
        clearInterval(tickerIntervalRef.current);
      }
      tickerIntervalRef.current = setInterval(() => fetchTickerData(selectedPair), 30000);
    }

    return () => {
      if (tickerIntervalRef.current) {
        clearInterval(tickerIntervalRef.current);
      }
    };
  }, [selectedPair, isChartReady]);

  const handleSymbolChange = (e) => {
    const newPair = e.target.value;
    
    // Immediate UI Reset
    setTickerData({
      price: '---',
      change: '---',
      changeClass: 'text-xl font-mono text-gray-400',
      high: '---',
      low: '---'
    });
    setLegendData(prev => ({
      ...prev,
      ohlc: 'O: -- H: -- L: -- C: --',
      volume: 'V: --'
    }));

    setSelectedPair(newPair);
  };

  return (
    <div className="flex flex-col flex-1 h-full w-full bg-[#0d0d0f] text-[#d1d4dc]">
      <div className="flex flex-col flex-1 h-full w-full">
        {/* Header */}
        <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="hidden flex items-center gap-3">
            <select
              id="symbol-select"
              value={selectedPair}
              onChange={handleSymbolChange}
              className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
            >
              <option value="pdex-usdt">PDEX / USDT</option>
              <option value="dot-usdt">DOT / USDT</option>
              <option value="dot-pdex">DOT / PDEX</option>
              <option value="pha-usdt">PHA / USDT</option>
              <option value="astar-usdt">ASTAR / USDT</option>
              <option value="glmr-usdt">GLMR / USDT</option>
              <option value="pink-usdt">PINK / USDT</option>
              <option value="ibtc-usdt">IBTC / USDT</option>
            </select>
            <div className={statusBadge.className}>
              {statusBadge.text}
            </div>
          </div>
        </header>

        {/* Ticker Info Bar */}
        <div className="hidden mb-6 grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-900/50 p-4 rounded-xl border border-gray-800">
          <div>
            <span className="block text-gray-500 text-xs uppercase font-bold mb-1">Current Price</span>
            <span className="text-xl font-mono text-white">{tickerData.price}</span>
          </div>
          <div>
            <span className="block text-gray-500 text-xs uppercase font-bold mb-1">24h Change</span>
            <span className={tickerData.changeClass}>{tickerData.change}</span>
          </div>
          <div>
            <span className="block text-gray-500 text-xs uppercase font-bold mb-1">24h High</span>
            <span className="text-xl font-mono text-gray-300">{tickerData.high}</span>
          </div>
          <div>
            <span className="block text-gray-500 text-xs uppercase font-bold mb-1">24h Low</span>
            <span className="text-xl font-mono text-gray-300">{tickerData.low}</span>
          </div>
        </div>

        {/* Chart Container */}
         {isChartError ? (
            <div className="flex items-center justify-center h-full w-full">
              <p className="text-red-500">Chart data not available</p>
            </div>
            ) : (
              <div className="flex-1 w-full h-full min-h-[300px] bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-2xl relative">
                {isLoading && (
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                  </div>
                )}
                {/* Legend overlay */}
                <div className="absolute top-4 left-4 z-20 bg-gray-900/80 p-2 rounded border border-gray-700 text-xs font-mono pointer-events-none">
                  <div className="flex gap-4">
                    <span className="font-bold text-blue-400">{legendData.symbol}</span>
                    <span>{legendData.ohlc}</span>
                    <span className="text-gray-400">{legendData.volume}</span>
                  </div>
                </div>
                  <div ref={chartContainerRef} className="absolute inset-0"></div>
              </div>
            )}

        {/* Meta Info */}
        <footer className="hidden mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
            <span className="block text-gray-500 text-xs uppercase font-bold mb-1">Last Update</span>
            <span className="text-sm font-mono text-gray-200">{lastUpdate}</span>
          </div>
          <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
            <span className="block text-gray-500 text-xs uppercase font-bold mb-1">Data Source</span>
            <span className="text-sm font-mono text-gray-200">CoinGecko (Demo)</span>
          </div>
          <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
            <span className="block text-gray-500 text-xs uppercase font-bold mb-1">Server Security</span>
            <span className="text-sm font-mono text-gray-200">HMAC-Signed</span>
          </div>
        </footer>
      </div>
    </div>
  );
};
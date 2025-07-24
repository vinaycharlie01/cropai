'use client';

import React, { useState } from 'react';
import { MandiPriceRecord } from '@/types/mandi-prices';

export default function MandiPricesPage() {
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [commodity, setCommodity] = useState('');
  const [data, setData] = useState<MandiPriceRecord[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchPrices = async () => {
    setIsLoading(true);
    setError('');
    setData([]);
    try {
      const res = await fetch(`/api/mandi-prices?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}&commodity=${encodeURIComponent(commodity)}`);
      if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to fetch prices.');
      };

      const json = await res.json();
      if (!Array.isArray(json)) throw new Error('Unexpected response structure');
      setData(json);
      setError('');
      if(json.length === 0) {
        setError('No data found for the selected filters. Please try a different combination.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected response was received from the server.');
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto bg-background rounded-lg shadow">
      <h1 className="text-3xl font-bold mb-4 font-headline text-primary">Mandi Prices Dashboard</h1>
      <p className="text-muted-foreground mb-6">Search for live commodity prices from markets in your district.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <input
          className="border rounded p-2 bg-background"
          type="text"
          placeholder="State (e.g. Andhra Pradesh)"
          value={state}
          onChange={(e) => setState(e.target.value)}
        />
        <input
          className="border rounded p-2 bg-background"
          type="text"
          placeholder="District (e.g. Chittor)"
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
        />
        <input
          className="border rounded p-2 bg-background"
          type="text"
          placeholder="Commodity (e.g. Tomato)"
          value={commodity}
          onChange={(e) => setCommodity(e.target.value)}
        />
      </div>

      <button
        className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md"
        onClick={fetchPrices}
        disabled={isLoading}
      >
        {isLoading ? 'Loading...' : 'Get Prices'}
      </button>

      {error && <p className="text-destructive mt-4">{error}</p>}
      
      {isLoading && !error && <p className="text-muted-foreground mt-4">Loading data, please wait...</p>}

      {data.length > 0 && (
        <div className="mt-6 overflow-auto">
          <table className="min-w-full table-auto border border-border">
            <thead className="bg-muted">
              <tr>
                <th className="p-2 border-b text-left">Market</th>
                <th className="p-2 border-b text-left">Commodity</th>
                <th className="p-2 border-b text-left">Variety</th>
                <th className="p-2 border-b text-center">Date</th>
                <th className="p-2 border-b text-right">Min Price (₹)</th>
                <th className="p-2 border-b text-right">Max Price (₹)</th>
                <th className="p-2 border-b text-right font-bold">Modal Price (₹)</th>
              </tr>
            </thead>
            <tbody>
              {data.map((record, i) => (
                <tr key={i} className="text-sm hover:bg-muted/50">
                  <td className="p-2 border-b">{record.market}</td>
                  <td className="p-2 border-b">{record.commodity}</td>
                  <td className="p-2 border-b">{record.variety}</td>
                  <td className="p-2 border-b text-center">{record.arrival_date}</td>
                  <td className="p-2 border-b text-right">{record.min_price}</td>
                  <td className="p-2 border-b text-right">{record.max_price}</td>
                  <td className="p-2 border-b text-right font-semibold text-primary">{record.modal_price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

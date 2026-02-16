"use client";

import type { DataUIPart } from "ai";
import type React from "react";
import { createContext, useContext, useMemo, useState } from "react";
import type { RagTracePayload } from "@/lib/rag/trace";
import type { CustomUIDataTypes } from "@/lib/types";

type DataStreamContextValue = {
  dataStream: DataUIPart<CustomUIDataTypes>[];
  setDataStream: React.Dispatch<
    React.SetStateAction<DataUIPart<CustomUIDataTypes>[]>
  >;
  ragTrace: RagTracePayload | null;
  setRagTrace: React.Dispatch<
    React.SetStateAction<RagTracePayload | null>
  >;
};

const DataStreamContext = createContext<DataStreamContextValue | null>(null);

export function DataStreamProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [dataStream, setDataStream] = useState<DataUIPart<CustomUIDataTypes>[]>(
    []
  );
  const [ragTrace, setRagTrace] = useState<RagTracePayload | null>(null);

  const value = useMemo(
    () => ({ dataStream, setDataStream, ragTrace, setRagTrace }),
    [dataStream, ragTrace]
  );

  return (
    <DataStreamContext.Provider value={value}>
      {children}
    </DataStreamContext.Provider>
  );
}

export function useDataStream() {
  const context = useContext(DataStreamContext);
  if (!context) {
    throw new Error("useDataStream must be used within a DataStreamProvider");
  }
  return context;
}

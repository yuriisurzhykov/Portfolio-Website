"use client";
import * as React from "react";

export const FieldControlContext = React.createContext<{ descriptionId?: string; invalid?: boolean }>({});

export function useFieldControl() { return React.useContext(FieldControlContext); }

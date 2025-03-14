"use client";

import React, { useEffect, useRef, useState } from "react";
import { FaMoon, FaSun } from "react-icons/fa";
import { useStore } from "zustand";

import {
  ConversionStore,
  createConversionStore,
} from "./state/ConversionState";
import { getRandomData, initialState } from "./state/initialState";
import { compressState, decompressState } from "@/utils/stateCompression";
import { findRecentState, getRecentState, updateRecentStates } from "./state/localstorage";
import Worksheet from "./Worksheet";
import { getSerializedSelector } from "./state/selectors/SerializeSelector";
import { generateUUID } from "@/utils/uuid";


const Page: React.FC = () => {
  // Keep a state id to save/update the state to local storage
  // We keep multiple states in local storage, so we need to know which one to update
  const [stateId, setStateId] = useState<string>(generateUUID(16));

  // We only need this on page load to determine the initial state
  const urlHashRef = useRef<string>(window.location.hash)

  // Keep track of the hash for future use
  // const [currentHash, setCurrentHash] = useState(window.location.hash);

  const storeRef = useRef<ConversionStore | undefined>(undefined);
  if (storeRef.current === undefined) {
    // Create a new store with random data
    storeRef.current = createConversionStore(initialState({ ...getRandomData() }));
  }

  const state = useStore(storeRef.current);

  // Allow for loading a state by id from local storage
  const loadById = (id: string) => {
    const state = findRecentState(id);
    if (state) {
      setStateId(id);
      storeRef.current?.setState(state);
    } else {
      createNewState(true);
    }
  }

  // Create a new state, either from random data or the most recent state
  const createNewState = (findRecent: boolean) => {
    const newId = generateUUID(16);
    setStateId(newId);
    const recentState = getRecentState()
    const newState = findRecent && recentState ? recentState : initialState({ ...getRandomData() });
    storeRef.current?.setState(newState);
    updateRecentStates(newId, newState);
    window.location.hash = compressState(newState)
  };

  // For now, hash state is read only
  // useEffect(() => {
  //   const handleHashChange = () => {
  //     setCurrentHash(() => window.location.hash);
  //   };
    
  //   window.addEventListener('hashchange', handleHashChange);
    
  //   return () => {
  //     window.removeEventListener('hashchange', handleHashChange);
  //   };
  // }, []);

  // Needed to solve closure issue of window event listener with state
  useEffect(() => {
    const hash = urlHashRef.current.slice(1);
    if (hash.length === 0) {
      createNewState(true);
    } else if (hash.charAt(0) === "A") {
      const state = decompressState(hash);
      storeRef.current?.setState(state);
    } else {
      createNewState(false);
    }
  }, [urlHashRef]);

  useEffect(() => {
    window.location.hash = compressState(getSerializedSelector(state));
    updateRecentStates(stateId, getSerializedSelector(state));
  }, [state, stateId]);

  // Dark mode state
  const [darkMode, setDarkMode] = useState(false);
  const [showDarkModeToggle, setShowDarkModeToggle] = useState(false);
  
  // Check if we're on the specific domain and initialize dark mode state
  useEffect(() => {
    // Check if we're on localhost or the specific domain
    const hostname = window.location.hostname;
    setShowDarkModeToggle(hostname === 'localhost' || hostname === '1984vc.github.io');
    
    // Check if dark mode is already enabled
    const isDarkMode = document.documentElement.classList.contains('dark');
    setDarkMode(isDarkMode);
  }, []);
  
  // Toggle dark mode
  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    document.documentElement.classList.toggle('dark', newMode);
  };

  return (
    <div>
      <main className="flex min-h-screen flex-col items-center justify-between py-8">
        <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
          <Worksheet conversionState={state} currentStateId={stateId} loadById={loadById} createNewState={createNewState} />
        </div>
        
        {/* Dark mode toggle at bottom center */}
        {showDarkModeToggle && (
          <div className="w-full flex justify-center mt-8 mb-4">
            <button 
              onClick={toggleDarkMode}
              className="p-2 rounded bg-nt84blue hover:bg-nt84bluedarker text-white text-sm flex items-center gap-2"
              aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {darkMode ? <FaSun className="mr-1" /> : <FaMoon className="mr-1" />}
              {darkMode ? "Debug: Light Mode" : "Debug: Dark Mode"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Page;

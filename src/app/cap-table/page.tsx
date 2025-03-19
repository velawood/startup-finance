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
    
    // Check local storage for theme preference
    const storedTheme = localStorage.getItem('color-theme');
    
    if (storedTheme) {
      // If we have a stored preference, use it
      const isDarkMode = storedTheme === 'dark';
      setDarkMode(isDarkMode);
      document.documentElement.classList.toggle('dark', isDarkMode);
    } else {
      // If no stored preference, check if dark mode is already enabled
      // (this would be based on system preference or previous setting)
      const isDarkMode = document.documentElement.classList.contains('dark');
      setDarkMode(isDarkMode);
    }
  }, []);
  
  // Toggle dark mode
  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    document.documentElement.classList.toggle('dark', newMode);
    
    // Save preference to local storage when user explicitly toggles
    localStorage.setItem('color-theme', newMode ? 'dark' : 'light');
  };

  return (
    <div>
      <main className="flex min-h-screen flex-col items-center justify-between py-8">
        {/* Breadcrumb and Heading */}
        <div className="z-10 w-full max-w-5xl mb-6 px-2">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            <a className="hover:text-nt84orange" href="https://1984.vc/docs/founders-handbook">Founders Handbook</a> &gt; <span>Cap Table Worksheet</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            1984 Cap Table Worksheet
          </h1>
        </div>
        
        <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
          <Worksheet
            conversionState={state}
            currentStateId={stateId}
            loadById={loadById}
            createNewState={createNewState}
          />
        </div>

        {/* Dark mode toggle at top right corner */}
        {showDarkModeToggle && (
          <div className="absolute top-4 right-4">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm flex items-center gap-2 transition-colors"
              aria-label={
                darkMode ? "Switch to light mode" : "Switch to dark mode"
              }
            >
              {darkMode ? (
                <FaSun className="mr-0 md:mr-1" />
              ) : (
                <FaMoon className="mr-0 md:mr-1" />
              )}
              <span className="hidden md:inline">
                {darkMode ? "Founder Mode" : "VC Mode"}
              </span>
            </button>
          </div>
        )}

        <div className="w-full max-w-5xl px-4 mt-24 border-t pt-8 border-gray-300 dark:border-gray-500">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            About the Cap Table Worksheet
          </h1>
          
          <div className="space-y-6 text-gray-700 dark:text-gray-300">
            <p className="leading-relaxed">
              At 1984 we believe founders should be able to quickly understand the
              decisions they make with regards to financing, particularly at the
              earliest stages when legal support is minimal. We believe SAFEs in
              particular should be easy to understand and model, and the tools
              should be open source, well-tested, and easy for anyone to use.
              Currently the best we have are either aging Excel spreadsheets that
              get passed around, or a fairly rudimentary webapp–which is why we
              created this project.
            </p>
            
            <p className="leading-relaxed">
              The captable worksheet is an open-source, client-side tool to help
              founders model their SAFE and priced rounds. The module is available
              on{" "}
              <a
                href="https://github.com/1984vc/startup-finance"
                target="_blank"
                rel="noopener"
                className="text-nt84orange hover:text-nt84orangedarker underline font-medium"
              >
                github
              </a>{" "}
              and 1984 hosts an instance at{" "}
              <a 
                href="/docs/cap-table-worksheet"
                className="text-nt84orange hover:text-nt84orangedarker underline font-medium"
              >
                https://1984.vc/docs/cap-table-worksheet
              </a>
            </p>
            
            <p className="leading-relaxed pt-2 border-t border-gray-200 dark:border-gray-700">
              We value all input! If you'd like to report bugs, provide feedback,
              or suggest improvements, please email{" "}
              <a 
                href="mailto:team@1984.vc"
                className="text-nt84orange hover:text-nt84orangedarker underline font-medium"
              >
                team@1984.vc
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Page;

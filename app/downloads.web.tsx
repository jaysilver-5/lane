import React from 'react';
import { Redirect } from 'expo-router';

// Keep old bookmarks usable without exposing native pack management on web.
export default function Downloads() { return <Redirect href="/study"/>; }

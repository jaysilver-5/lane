import React from 'react';
import { Redirect } from 'expo-router';

// Recover URLs produced by the previous /appearance navigation destination.
export default function LegacyAppearance() {
  return <Redirect href="/display" />;
}

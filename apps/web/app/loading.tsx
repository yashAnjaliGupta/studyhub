import React from 'react';
import { StudyHubLoader } from '../components/StudyHubLoader';

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6">
      <StudyHubLoader
        size={80}
        text="Loading StudyHub materials..."
        className="my-auto"
      />
    </div>
  );
}

"use client"
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Users, Medal } from 'lucide-react';
import Link from 'next/link';
import HeadingWithUnderline from '../components/dashboard/headingWithUnderline';
import { sports } from '../utils/forms/schema';
import { useRouter } from 'next/navigation';
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-unused-vars */

interface SubmittedForm {
  Players: number;
  status: 'confirmed' | 'not_confirmed';
}

interface UserData {
  name: string;
  universityName: string;
  email: string;
  submittedForms?: {
    [key: string]: SubmittedForm;
  };
}

const getAuthToken = (): string | null => {
  const cookies = document.cookie.split("; ");
  const authToken = cookies.find(cookie => cookie.startsWith("authToken="));
  return authToken ? authToken.split("=")[1] : null;
};

const StatusDot = ({ status }: { status: string }) => (
  <div className="flex items-center space-x-2">
    <div 
      className={`w-2 h-2 rounded-full ${
        status === 'confirmed' ? 'bg-green-500' : 'bg-yellow-500'
      }`}
    />
    <span className={`text-sm ${
      status === 'confirmed' ? 'text-green-700' : 'text-yellow-700'
    }`}>
      {status === 'confirmed' ? 'Registered' : 'In review'}
    </span>
  </div>
);

const SportCard = ({ sport, players, status }: { sport: string, players: number, status: string }) => (
  <div className="bg-white rounded-xl p-6 border border-gray-100 hover:border-black transition-all duration-300 group">
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-bold text-lg text-gray-900 group-hover:text-black">
        {sport.replace('_', ' ')}
      </h3>
      <Trophy className="w-5 h-5 text-black opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
    <div className="flex flex-col space-y-3">
      <div className="flex items-center space-x-2">
        <Users className="w-4 h-4 text-gray-600" />
        <span className="text-sm bg-black text-white px-3 py-1 rounded-full font-medium">
          {players} Players
        </span>
      </div>
      <StatusDot status={status} />
    </div>
  </div>
);

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center p-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
    <Medal className="w-16 h-16 text-gray-400 mb-4" />
    <h3 className="text-xl font-bold text-gray-700 mb-2">No Sports Registered</h3>
    <p className="text-gray-500 text-center max-w-md">
      You haven't registered for any sports yet. Register for a sport to start your athletic journey!<br></br> you can register for a sport by going to Registration form page from side bar or clicking on this <Link href="/dashboard/regForm" className='text-blue-600'>link</Link>
    </p>
  </div>
);

const LoadingState = () => (
  <div className="animate-pulse space-y-8">
    <div className="h-32 bg-gray-200 rounded-2xl"></div>
    <div className="h-48 bg-gray-200 rounded-lg"></div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-40 bg-gray-200 rounded-xl"></div>
      ))}
    </div>
  </div>
);

export default function Dashboard() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const syncDashboard = async () => {
      try {
        const response = await fetch('/api/sync/dashboard', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cookies: getAuthToken(),
          }),
        });

        const data = await response.json();
        
        // console.log('Dashboard sync response:', data);

        if (!data.success) {
          setError(data.error?.message || 'Failed to sync dashboard');
          // console.error('Dashboard sync failed:', data.error);
        } else {
          setUserData(data.data);
          // Check if universityName is empty and redirect
          if (!data.data.universityName || data.data.universityName.length === 0) {
            router.push('/enter-institution-name'); // Replace with your desired redirect path
            return;
          }
          if (!data.data.phone || data.data.phone.length === 0) {
            router.push('/enter-phone-number'); // Replace with your desired redirect path
            return;
          }
        }
      } catch (err) {
        // console.error('Error syncing dashboard:', err);
        setError('Failed to connect to the server');
      } finally {
        setLoading(false);
      }
    };

    syncDashboard();
  }, [router]);

  if (loading) {
    return (
      <div className="h-screen pt-6 pr-6 w-full max-w-[1200px]">
        <LoadingState />
      </div>
    );
  }

  if (!userData) {
    return null;
  }

  const formattedName = userData.name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const hasRegistrations = userData.submittedForms && Object.keys(userData.submittedForms).length > 0;

  return (
    <div className="h-screen pt-6 pr-6 w-full max-w-[1200px]">
      <HeadingWithUnderline
        text="Agneepath 7.0"
        desktopSize="md:text-6xl"
        mobileSize="text-3xl sm:text-2xl"
      />
      <h3 className ="text-lg font-semibold text-gray-700 mt-1 mb-6 text-center">
        30 January, 31 January, 1 February, 2026!
      </h3>
      
      <div className="bg-gradient-to-r from-gray-900 to-black rounded-2xl p-8 text-white">
        <h2 className="text-3xl font-bold mb-2">
          Welcome back, {formattedName}! 🏆
        </h2>
        <p className="text-gray-300">
          Track your sports registrations and stay in the game
        </p>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Profile Card */}
      <Card className="border-none shadow-lg mt-8">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-xl text-gray-900">Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col">
              <span className="text-sm text-gray-500 mb-1">Name</span>
              <span className="font-medium text-gray-900">{formattedName}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-gray-500 mb-1">University</span>
              <span className="font-medium text-gray-900">{userData.universityName}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-gray-500 mb-1">Email</span>
              <span className="font-medium text-gray-900">{userData.email}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sports Registration Section */}
      <div className="space-y-6 mt-8 mb-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Registered Sports</h2>
          {hasRegistrations && (
            <div className="flex items-center space-x-2 bg-black text-white px-4 py-2 rounded-full">
              <Trophy className="w-4 h-4" />
              <span className="text-sm font-medium">
                {Object.keys(userData.submittedForms || {}).length} Sports
              </span>
            </div>
          )}
        </div>

        {hasRegistrations ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(userData.submittedForms || {}).map(([sport, data]) => (
              <SportCard
                key={sport}
                sport={sports[sport]}
                players={data.Players}
                status={data.status}
              />
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}
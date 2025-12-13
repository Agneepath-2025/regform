"use client";

import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignUp } from "../../components/authentication/SignUp";
import { Login } from "../../components/authentication/Login";
/* eslint-disable @typescript-eslint/no-explicit-any */
export default function LoginPage() {
  const [tabValue, setTabValue] = useState("SignIn");
  const router = useRouter();

  const handleGoogleSuccess = (response: any) => {
    const token = response.credential;

    // Send token to backend for verification and to check if universityName is required
    fetch("/api/auth/google", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    })
      .then((res) => res.json())
      .then((data) => {
        const { token, universityNameRequired } = data;

        // Store the encrypted token in cookies (assuming you are using js-cookie)
        const isProduction = window.location.protocol === 'https:';
        document.cookie = `authToken=${token}; path=/; ${isProduction ? 'Secure; ' : ''}SameSite=Lax; max-age=172800`;

        if (universityNameRequired) {
          // Redirect to page to enter institution name
          router.push("/enter-institution-name");
        } else {
          // User is fully logged in, redirect to dashboard or home page
          router.push("/dashboard");
        }
      })
      .catch((err) => 
        console.error("Google login failed:", err));
  };

  const handleGoogleError = () => {
    console.error("Google Login Failed");
  };

  return (
    <div className="flex flex-col items-center w-[350px]">
      <Tabs value={tabValue} onValueChange={setTabValue} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="SignIn">Sign In</TabsTrigger>
          <TabsTrigger value="SignUp">Sign Up</TabsTrigger>
        </TabsList>

        <TabsContent value="SignIn">
          <div className="items-center sm:items-center justify-items-center">
            <Login />
            <p className="pt-5">
              Don&apos;t have an account?{" "}
              <button
                onClick={() => setTabValue("SignUp")}
                className="text-blue-600 hover:underline"
              >
                Sign Up now
              </button>
            </p>
          </div>
        </TabsContent>

        <TabsContent value="SignUp">
          <div className="items-center sm:items-center justify-items-center">
            <SignUp />
            <p className="pt-5">
              Already have an account?{" "}
              <button
                onClick={() => setTabValue("SignIn")}
                className="text-blue-600 hover:underline"
              >
                Sign In
              </button>
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Divider */}
      <div className="my-6 w-full flex items-center">
        <div className="flex-grow border-t border-gray-300"></div>
        <span className="px-4 text-lg text-gray-500 font-semibold">OR</span>
        <div className="flex-grow border-t border-gray-300"></div>
      </div>

      {/* Google Login Button */}
      <GoogleLogin
        onSuccess={handleGoogleSuccess}
        onError={handleGoogleError}
        type="standard"
        useOneTap
        theme="outline"
        logo_alignment="center"
        text="signin_with"
        size="large"
      />
    </div>
  );
}

"use client"
/* eslint-disable @typescript-eslint/no-unused-vars */

import * as React from "react";
import { Button } from "@/components/ui/button";
import { decrypt } from "@/app/utils/encryption";
import { post } from "@/app/utils/PostGetData";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import styles from "@/app/styles/spinner.module.css"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRouter } from "next/navigation";
export default function VerifyAccount() {
    const router = useRouter(); // Use the useRouter hook

  const [error, setError] = useState<string>(""); // Moved inside the component
  const [success, setSuccess] = useState<string>(""); // Moved inside the component
  const [isLoading, setIsLoading] = useState<boolean>(false); // Moved inside the component
  const searchParams = useSearchParams();
  const handleResendEmail = async (e: React.MouseEvent<HTMLButtonElement>) => {
    setSuccess("");
    setError("");
    setIsLoading(true);
    const v = searchParams.get("v"); // Extract 'v' from the query params
    if (!v) {
      setError("Invalid verification token.");
      setIsLoading(false);
      return;
    }
    try {
      const decryptedValue = decrypt(v);
      if (!decryptedValue || !decryptedValue.email) {
        setError("Unable to decrypt token or invalid data.");
        setIsLoading(false);
        return;
      }
      const response = await post<{ email?: string; message?: string }>("/api/Mailer/Verification", {
        email: decryptedValue.email,
      });
      if (response.error) {
        setError(response.error.message);
      } else if (response.data && response.data.message === "Email is already verified") {
        setSuccess("Your email is already verified. You can login now.");
      } else {
        setSuccess("Verification email has been resent.");
      }
    } catch (error) {
      // console.error("Error during resend email:", error);
      setError("An unexpected error occurred.");
    }
    setIsLoading(false);
  };
  const navigateToLogin = () => {
    router.push("/SignIn"); // Navigate to the login page
  };

  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Verify Your Account</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">
          An email has been sent to your registered email address. Please check your inbox and follow the instructions to verify your account.
        </p>
        <p className="text-sm text-gray-500 mb-4">
          If you don’t see the email, check your spam or junk folder.
        </p>
        {error && <p className="text-red-500">{error}</p>}
        {success && <p className="text-green-500">{success}</p>}
      </CardContent>
      <CardFooter className="flex justify-between">
      <Button
          variant={"outline"}
          onClick={navigateToLogin} // Add the click handler
        >
          Go to Login Page
        </Button>
      <Button
          onClick={handleResendEmail}
          disabled={isLoading}
          className={isLoading ? " opacity-50 cursor-not-allowed" : ""}
        >
          {isLoading ? <div className={styles.spinner}></div> : "Resend Email"}
        </Button>
        
      </CardFooter>
    </Card>
  );
}

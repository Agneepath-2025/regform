"use client";
/* eslint-disable @typescript-eslint/no-unused-vars */

import * as React from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { post } from "@/app/utils/PostGetData"; // Assuming you have a post function to send API requests
import { encrypt } from "@/app/utils/encryption";

// Define interfaces for clarity
interface LoginApiResponse {
    token?: string;
    error?: string;
    message?:string;
    success?: boolean;
    emailverif?:boolean;
}

export function Login() {
    const router = useRouter();
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [error, setError] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        if (id === "email") {
            setEmail(value);
        } else if (id === "password") {
            setPassword(value);
        }
    };

    const validateForm = (): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError("Please enter a valid email address.");
            return false;
        }

        if (password.length < 8) {
            setError("Password must be at least 8 characters long.");
            return false;
        }

        if (!email || !password) {
            setError("Both email and password are required.");
            return false;
        }

        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (!validateForm()) return;

        setIsLoading(true);

        try {
            // Make the API call to check if the email is verified and to authenticate
            const { data, error  } = await post<LoginApiResponse>("/api/auth/login", { emaile: email,passworde:password });
            // console.log(error.message);
            if (data) {
                if (data.success && data.emailverif == false) {
                    // If email is not verified, route to verification page
                    setError("Please verify your email before logging in.");
                    await post<{ email: string }>("/api/Mailer/Verification", { email: email });
                    router.push(`/Verification?v=${encrypt({ email: email })}`);
                    return;
                }
                
                if (data.token) {
                    // console.log(data.token);
                    // If email is verified and login is successful, store the token
                    const isProduction = window.location.protocol === 'https:';
                    document.cookie = `authToken=${data.token}; path=/; ${isProduction ? 'Secure; ' : ''}SameSite=Lax; max-age=172800`;
                    router.push("/dashboard"); // Redirect to the dashboard or desired page
                } else {
                    setError(data.error || "Something went wrong.");
                }
            } else {
                console.log(data);
                setError(error?.message || "Something went wrong.");
            }
        } catch (e) {
            setError("Failed to connect to the server. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="w-[350px]">
            <CardHeader>
                <CardTitle>Sign in to Agneepath 7.0</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit}>
                    <div className="grid w-full items-center gap-4">
                        <div className="flex flex-col space-y-1.5">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                    {error && <p className="text-red-500">{error}</p>}
                </form>
            </CardContent>
            <CardFooter className="flex justify-end">
                <Button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className={isLoading ? "opacity-50 cursor-not-allowed" : ""}
                >
                    {isLoading ? "Loading..." : "Sign In"}
                </Button>
            </CardFooter>
        </Card>
    );
}

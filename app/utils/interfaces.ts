/* eslint-disable @typescript-eslint/no-wrapper-object-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
export interface User {
  phone:any;
  _id:Object;
  name: string;
  universityName: string;
  email: string;
  password?: string;
  emailVerified?: boolean;
  VerificationId?: string;
  vid?: string;
  submittedForms?:Record<string,any>;
  Accommodation?:Record<string,any>;
  registrationDone?: boolean;
  paymentDone?: boolean;

}

export interface ErrorMessage {
  success : false,
  code: number;
  message: string;
  details?: string;
}

export function createErrorResponse(code: number, message: string, details?: string): Response {
    const errorMessage: ErrorMessage = {success:false, code, message, details };
    return new Response(JSON.stringify(errorMessage), {
      status: code,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
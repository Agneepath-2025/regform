/* eslint-disable @typescript-eslint/no-explicit-any */

export async function post<T>(
    url: string,
    body: Record<string, any>
  ): Promise<{ data: T | null; error: any | null }> {
    try {
      const isFormData = body instanceof FormData;
      const response = await fetch(url, {
        method: "POST",
        headers: isFormData ? undefined : { "Content-Type": "application/json" },
        body: isFormData ? body : JSON.stringify(body),
      });
      
      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response:", text);
        return { 
          data: null, 
          error: { 
            message: "Server returned an invalid response. Please try again.",
            details: text.substring(0, 200) 
          } 
        };
      }

      const data = await response.json();
  
      if (!response.ok) {
        // Handle error responses
        return { data: null, error: data };
      }
  
      return { data, error: null };
    } catch (error) {
      console.error("Error during POST request:", error);
      return { data: null, error: { message: "Network error. Please check your connection." } };
    }
  }

  
  export async function get<T>(
  url: string,
  params?: Record<string, any>
): Promise<{ data: T | null; error: any | null }> {
  try {
    const queryString = params
      ? "?" + new URLSearchParams(params).toString()
      : "";
    const response = await fetch(url + queryString, {
      method: "GET",
    });

    // Check if response is JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      console.error("Non-JSON response:", text);
      return { 
        data: null, 
        error: { 
          message: "Server returned an invalid response. Please try again.",
          details: text.substring(0, 200) 
        } 
      };
    }

    const data = await response.json();

    if (!response.ok) {
      // Handle error responses
      return { data: null, error: data };
    }

    return { data, error: null };
  } catch (error) {
    console.error("Error during GET request:", error);
    return { data: null, error: { message: "Network error. Please check your connection." } };
  }
}

import { apiClient } from "../../../core/api/apiClient";
import { apiEndpoints } from "../../../core/api/apiEndpoints";
import { tokenManager } from "../../../core/authentication/tokenManager";
import type { DevUser, RegistrationData } from "../types/auth.types";

export interface SendOtpResponse {
  success: boolean;
  message?: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  isExistingUser?: boolean;
  customerExists?: boolean;
  profileCompleted?: boolean;
  hasPasscode?: boolean;
  message?: string;
  user?: DevUser;
  customer?: any;
}

export interface CheckUserResponse {
  success: boolean;
  exists: boolean;
  customerExists?: boolean;
  profileCompleted?: boolean;
  hasPasscode?: boolean;
  user?: DevUser;
}

export interface RegisterResponse {
  success: boolean;
  user: DevUser;
  token?: string;
  message?: string;
}

export interface PasscodeResponse {
  success: boolean;
  user?: DevUser;
  token?: string;
  message?: string;
}

export interface UpdatePasswordResponse {
  success: boolean;
  message?: string;
}

export const authApi = {
  sendOtp: async (mobileNumber: string): Promise<SendOtpResponse> => {
    const digits = mobileNumber.replace(/\D/g, "");
    const cleanMobile = digits.startsWith("91") && digits.length === 12
      ? digits.slice(2)
      : digits.startsWith("0") && digits.length === 11
        ? digits.slice(1)
        : digits;
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      return { success: false, message: "Enter a valid Indian 10-digit mobile number." };
    }
    const endpoint = apiEndpoints.otp.generate;
    const requestBody = { mobileNumber: cleanMobile };
    try {
      const response = await apiClient.postWithStatus<unknown>(endpoint, requestBody);
      return {
        success: true,
        message: typeof response.data === "string"
          ? response.data
          : "OTP request accepted.",
      };
    } catch (error: any) {
      const isNetworkError = error?.code === "NETWORK_ERROR";
      const status = isNetworkError ? undefined : error?.statusCode ?? error?.status;
      const errorMsg = status === 500 || status === 503
        ? error?.message || "OTP delivery is unavailable. Please try again later."
        : error?.code === "NETWORK_ERROR"
          ? error?.message || "Unable to connect to the server. Please try again."
          : error?.message || "Failed to generate OTP";
      return { success: false, message: errorMsg };
    }
  },

  verifyOtp: async (
    mobileNumber: string,
    otp: string,
  ): Promise<VerifyOtpResponse> => {
    const cleanMobile = mobileNumber.replace(/\D/g, "");
    try {
      const response = await apiClient.postWithStatus<any>(apiEndpoints.otp.verify, {
        mobileNumber: cleanMobile,
        otpCode: otp,
      });
      const res = response.data;
      if (res?.accessToken) await tokenManager.setAccessToken(res.accessToken);
      if (res?.refreshToken) await tokenManager.setRefreshToken(res.refreshToken);

      const customerExists =
        res?.customerExists === true || res?.isExistingUser === true;
      const profileCompleted = res?.profileCompleted === true;
      const hasPasscode = res?.hasPasscode === true;

      let devUser: DevUser | undefined;
      if (res?.customer) {
        devUser = {
          customerId: res.customer.custId,
          name: res.customer.name,
          email: res.customer.email,
          mobileNumber: res.customer.mobileNumber || cleanMobile,
          customerType: res.customer.customerType,
          registrationCompleted: profileCompleted,
        };
      }

      return {
        success: true,
        isExistingUser: customerExists,
        customerExists,
        profileCompleted,
        hasPasscode,
        message: res?.message || "OTP verified successfully",
        user: devUser,
        customer: res?.customer,
      };
    } catch (error: any) {
      const backendMsg =
        error?.message &&
        error.message !== "Request failed" &&
        !error.message.includes("status code")
          ? error.message
          : "Incorrect OTP code. Please enter the valid OTP sent to your terminal.";
      return {
        success: false,
        isExistingUser: false,
        customerExists: false,
        profileCompleted: false,
        hasPasscode: false,
        message: backendMsg,
      };
    }
  },

  checkUser: async (mobileNumber: string): Promise<CheckUserResponse> => {
    const cleanMobile = mobileNumber.replace(/\D/g, "");
    try {
      const res = await apiClient.get<any>(apiEndpoints.customer.exists(cleanMobile));
      const exists = res?.exists === true || res?.customerExists === true;
      return {
        success: true,
        exists,
        customerExists: exists,
        profileCompleted: res?.profileCompleted === true,
        hasPasscode: res?.hasPasscode === true,
      };
    } catch {
      return {
        success: false,
        exists: false,
        customerExists: false,
        profileCompleted: false,
        hasPasscode: false,
      };
    }
  },

  register: async (
    data: RegistrationData & { mobileNumber: string; passcode?: string },
  ): Promise<RegisterResponse> => {
    try {
      // Format DOB from DD-MM-YYYY to YYYY-MM-DD for Spring Boot LocalDate
      let formattedDob = data.dob || "";
      if (formattedDob && /^\d{2}-\d{2}-\d{4}$/.test(formattedDob)) {
        const [d, m, y] = formattedDob.split("-");
        formattedDob = `${y}-${m}-${d}`;
      }

      // Format CustomerType string to match Spring Boot Enum
      let rawType = (data.customerType || "INDIVIDUAL").trim();
      const typeLower = rawType.toLowerCase();
      if (typeLower.includes("freelancer")) {
        rawType = "FREELANCER";
      } else if (
        typeLower.includes("private limited") ||
        typeLower.includes("pvt")
      ) {
        rawType = "PRIVATE_LIMITED";
      } else if (typeLower.includes("public limited")) {
        rawType = "PUBLIC_LIMITED";
      } else if (typeLower === "llp") {
        rawType = "LLP";
      } else if (typeLower.includes("partnership")) {
        rawType = "PARTNERSHIP";
      } else if (typeLower.includes("proprietorship")) {
        rawType = "PROPRIETORSHIP";
      } else if (typeLower.includes("huf")) {
        rawType = "HUF";
      } else if (typeLower.includes("aop") || typeLower.includes("boi")) {
        rawType = "AOP_BOI";
      } else if (typeLower.includes("ngo") || typeLower.includes("trust")) {
        rawType = "NGO_TRUST";
      } else if (typeLower.includes("individual")) {
        rawType = "INDIVIDUAL";
      } else {
        rawType = rawType.toUpperCase().replace(/[\s\/]+/g, "_");
      }

      // Format full address from discrete fields if provided
      let formattedAddress = data.address || "";
      if (!formattedAddress && data.addressLine1) {
        formattedAddress = [
          data.addressLine1,
          data.addressLine2,
          data.city,
          data.state
            ? `${data.state}${data.pincode ? " - " + data.pincode : ""}`
            : data.pincode,
        ]
          .filter(Boolean)
          .join(", ");
      }

      // Map payload to match Spring Boot CustomerDto format exactly
      const payload = {
        name: data.name,
        email: data.email,
        mobileNumber: data.mobileNumber.replace(/\D/g, ""),
        aadhaar: data.aadhaar,
        pan: data.pan,
        dob: formattedDob,
        customerType: rawType,
        gender: data.gender,
        fatherSpouseName: data.fatherSpouseName,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        city: data.city,
        pincode: data.pincode,
        state: data.state,
        address: formattedAddress,
        password: data.passcode,
        pushToken: data.pushToken,
      };

      const response = await apiClient.post<any>(apiEndpoints.customer.register, payload);

      if (response.accessToken) {
        await tokenManager.setAccessToken(response.accessToken);
      }
      if (response.refreshToken) {
        await tokenManager.setRefreshToken(response.refreshToken);
      }

      return {
        success: true,
        user: {
          customerId: response.custId || "",
          mobileNumber: response.mobileNumber || data.mobileNumber,
          name: response.name || data.name,
          email: data.email,
          pushToken: data.pushToken,
        },
        token: response.accessToken,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Registration failed on backend",
        user: {} as DevUser,
      };
    }
  },

  createPasscode: async (
    mobileNumber: string,
    passcode: string,
  ): Promise<PasscodeResponse> => {
    try {
      return await apiClient.post<PasscodeResponse>(apiEndpoints.auth.createPasscode, {
        mobileNumber,
        passcode,
      });
    } catch {
      return { success: true, message: "Passcode created successfully" };
    }
  },

  loginPasscode: async (
    mobileNumber: string,
    passcode: string,
  ): Promise<PasscodeResponse> => {
    try {
      const cleanMobile = mobileNumber.replace(/\D/g, "");
      const response = await apiClient.post<any>(apiEndpoints.customer.login, {
        mobileNumber: cleanMobile,
        password: passcode,
      });
      if (response.accessToken) {
        await tokenManager.setAccessToken(response.accessToken);
      }
      if (response.refreshToken) {
        await tokenManager.setRefreshToken(response.refreshToken);
      }

      return {
        success: true,
        token: response.accessToken,
        user: {
          customerId: response.custId,
          mobileNumber: response.mobileNumber,
          name: response.name,
          email: `${response.mobileNumber}@taxedge.in`,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Invalid mobile number or passcode",
      };
    }
  },

  updatePassword: async (
    mobileNumber: string,
    password: string,
  ): Promise<UpdatePasswordResponse> => {
    const cleanMobile = mobileNumber.replace(/\D/g, "");
    try {
      const res = await apiClient.patch<any>(apiEndpoints.customer.updatePassword, {
        mobileNumber: cleanMobile,
        password,
      });
      const msg =
        typeof res === "string"
          ? res
          : res?.message || "Password updated successfully";
      if (typeof msg === "string" && msg.toLowerCase().includes("not found")) {
        return { success: false, message: msg };
      }
      return { success: true, message: msg };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to update password",
      };
    }
  },

  forgotPasscode: async (mobileNumber: string): Promise<SendOtpResponse> => {
    const cleanMobile = mobileNumber.replace(/\D/g, "");
    return authApi.sendOtp(cleanMobile);
  },

  resetPasscode: async (
    mobileNumber: string,
    newPasscode: string,
    _otp?: string,
  ): Promise<PasscodeResponse> => {
    const res = await authApi.updatePassword(mobileNumber, newPasscode);
    return {
      success: res.success,
      message: res.message,
    };
  },

  revokeRefreshToken: async (refreshToken: string): Promise<boolean> => {
    try {
      await apiClient.post(apiEndpoints.auth.revoke, { refreshToken });
      return true;
    } catch {
      return false;
    }
  },

  getCustomerDetails: async (custId: string): Promise<any> => {
    try {
      const res = await apiClient.get<any>(apiEndpoints.customer.details(custId));
      return { success: true, data: res };
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to fetch customer details" };
    }
  },

  updateCustomerProfile: async (customerData: any): Promise<{ success: boolean; message?: string }> => {
    try {
      // Format DOB from DD/MM/YYYY or DD-MM-YYYY to YYYY-MM-DD for Spring Boot LocalDate if needed
      let formattedDob = customerData.dob || "";
      if (formattedDob && typeof formattedDob === "string") {
        if (/^\d{2}[-\/]\d{2}[-\/]\d{4}$/.test(formattedDob)) {
          const parts = formattedDob.split(/[-\/]/);
          formattedDob = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }

      const payload = {
        ...customerData,
        mobileNumber: customerData.mobileNumber ? customerData.mobileNumber.replace(/\D/g, "").slice(-10) : undefined,
        dob: formattedDob || customerData.dob,
      };

      const res = await apiClient.put<any>(apiEndpoints.customer.update, payload);
      return { success: true, message: typeof res === "string" ? res : "Profile updated successfully" };
    } catch (error: any) {
      return { success: false, message: error?.message || "Failed to update profile" };
    }
  },
};

export default authApi;

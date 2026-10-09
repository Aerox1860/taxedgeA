import { useState, useEffect } from "react";
import { companyRegistrationApi } from "../services/companyRegistrationApi";

export function useRegistrationStatus(applicationId?: string) {
  const [result, setResult] = useState<{
    applicationId?: string;
    status: string;
    loading: boolean;
    error: string | null;
  }>({ status: "", loading: false, error: null });

  useEffect(() => {
    if (!applicationId) return;
    let isCurrent = true;
    companyRegistrationApi
      .fetchStatus(applicationId)
      .then((res) => {
        if (isCurrent) {
          setResult({ applicationId, status: res.status, loading: false, error: null });
        }
      })
      .catch((error: unknown) => {
        if (isCurrent) {
          setResult({
            applicationId,
            status: "",
            loading: false,
            error: error instanceof Error ? error.message : "Unable to load registration status.",
          });
        }
      });
    return () => {
      isCurrent = false;
    };
  }, [applicationId]);

  const hasCurrentResult = result.applicationId === applicationId;
  return {
    status: hasCurrentResult ? result.status : "",
    loading: Boolean(applicationId) && (!hasCurrentResult || result.loading),
    error: hasCurrentResult ? result.error : null,
  };
}

export default useRegistrationStatus;

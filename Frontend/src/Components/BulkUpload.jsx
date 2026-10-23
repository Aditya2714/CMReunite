import { useState } from "react";
import api from "../services/api";
import { FaFileCsv, FaFileExcel, FaUpload } from "react-icons/fa";
import { useLoggedIn } from "../services/authService";
import NotLoggedIn from "./helper/NotLoggedIn";

const requiredColumns = [
  "Name",
  "Graduating year",
  "email id",
];

const BulkUpload = () => {
  const loggedIn = useLoggedIn();
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
    setResult(null);
    setError("");
  };

  const handleUpload = async (event) => {
    event.preventDefault();

    if (!selectedFile) {
      setError("Please choose an XLSX workbook or CSV file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    setUploading(true);
    setError("");

    try {
      const response = await api.post("/bulk/bulkImport", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setResult(response.data.data);
      setSelectedFile(null);
      event.target.reset();
    } catch (uploadError) {
      setError(uploadError.response?.data?.message || "Bulk import failed.");
    } finally {
      setUploading(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none transition file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-bold file:text-blue-700 focus:border-blue-700 focus:ring-4 focus:ring-blue-100";

  return (
    <main className="bg-slate-50 px-4 py-8">
      {loggedIn ? (
        <section className="mx-auto max-w-5xl space-y-6">
          <div className="rounded-lg border border-slate-200 bg-slate-950 p-6 text-white shadow-xl md:p-8">
            <p className="mb-3 inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-teal-100">
              Admin import
            </p>
            <h1 className="text-3xl font-extrabold tracking-normal md:text-4xl">
              Bulk import alumni records.
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-300 md:text-base">
              Upload the department-wise monthly alumni workbook. Each sheet is
              matched to its department and valid rows are added to the alumni directory.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <form
              onSubmit={handleUpload}
              encType="multipart/form-data"
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6"
            >
              <div className="mb-5 flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-blue-50 text-blue-700">
                  <FaFileExcel />
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900">
                    Upload import file
                  </h2>
                  <p className="text-sm font-semibold text-slate-500">
                    Supported formats: `.xlsx` and `.csv`.
                  </p>
                </div>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-600">
                  Choose file
                </span>
                <input
                  type="file"
                  accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className={inputClass}
                  onChange={handleFileChange}
                />
              </label>

              {selectedFile && (
                <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm font-semibold text-slate-600">
                  Selected file: {selectedFile.name}
                </div>
              )}

              {error && (
                <div className="mt-4 rounded-lg bg-red-50 p-4 text-sm font-bold text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={uploading}
                className="mt-5 inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 font-extrabold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                <FaUpload /> {uploading ? "Importing..." : "Import Alumni"}
              </button>
            </form>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-teal-600">
                Import format
              </p>
              <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
                Required columns
              </h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {requiredColumns.map((column) => (
                  <span
                    key={column}
                    className="rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700"
                  >
                    {column}
                  </span>
                ))}
              </div>
              <p className="mt-5 text-sm font-semibold leading-6 text-slate-500">
                Use one department per sheet, such as CSE, ECE, or ISE. The
                department is taken from the sheet name. Optional columns are
                Contact information, LinkedIn Profile link, Current working
                designation, Employee/Entreprenur Details, and Address Details.
              </p>
              <p className="mt-3 flex items-center gap-2 text-sm font-semibold leading-6 text-slate-500">
                <FaFileCsv className="text-blue-700" />
                Accounts without a password receive a secure temporary password
                and must use Forgot password before their first login.
              </p>

              {result && (
                <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <h3 className="font-extrabold text-slate-900">
                    Import summary
                  </h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg bg-white p-4">
                      <p className="text-sm font-bold text-slate-500">
                        Imported
                      </p>
                      <strong className="mt-1 block text-2xl text-slate-900">
                        {result.imported}
                      </strong>
                    </div>
                    <div className="rounded-lg bg-white p-4">
                      <p className="text-sm font-bold text-slate-500">
                        Skipped
                      </p>
                      <strong className="mt-1 block text-2xl text-slate-900">
                        {result.skipped}
                      </strong>
                    </div>
                  </div>
                  {!!result.errors?.length && (
                    <div className="mt-4 space-y-2">
                      {result.errors.slice(0, 5).map((item) => (
                        <p
                          key={`${item.line}-${item.reason}`}
                          className="text-sm font-semibold text-slate-500"
                        >
                          {item.sheet ? `${item.sheet}, ` : ""}Line {item.line}: {item.reason}
                          {item.email ? ` (${item.email})` : ""}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        </section>
      ) : (
        <NotLoggedIn text="Bulk Import" />
      )}
    </main>
  );
};

export default BulkUpload;

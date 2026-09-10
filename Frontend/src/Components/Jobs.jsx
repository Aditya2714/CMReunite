import { useEffect, useState } from "react";
import api from "../services/api";
import {
  FaBriefcase,
  FaEdit,
  FaMapMarkerAlt,
  FaPaperPlane,
  FaPlus,
  FaTimes,
  FaTrash,
} from "react-icons/fa";
import { useCurrentUser } from "../services/authService";

const emptyJobForm = {
  title: "",
  company: "",
  location: "",
  type: "Full-time",
  description: "",
  status: "Open",
};

const formatJobForUi = (job) => ({
  id: job._id,
  title: job.title,
  company: job.company || "Not specified",
  location: job.location || "Not specified",
  type: job.type || "Full-time",
  description: job.description,
  status: job.status || "Open",
});

function Jobs() {
  const user = useCurrentUser() || {};
  const isAlumni = user.role === "alumni";
  const [jobForm, setJobForm] = useState(emptyJobForm);
  const [jobs, setJobs] = useState([]);
  const [editingJobId, setEditingJobId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const response = await api.get("/jobs/all");
        setJobs(response.data.data.jobs.map(formatJobForUi));
      } catch (error) {
        console.error("Jobs fetch failed:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setJobForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!jobForm.title.trim() || !jobForm.company.trim()) return;

    try {
      if (editingJobId) {
        const response = await api.patch(`/jobs/${editingJobId}`, jobForm);
        const updatedJob = formatJobForUi(response.data.data.job);
        setJobs((current) =>
          current.map((job) => (job.id === editingJobId ? updatedJob : job))
        );
      } else {
        const response = await api.post("/jobs/create", jobForm);
        const createdJob = formatJobForUi(response.data.data.job);
        setJobs((current) => [createdJob, ...current]);
      }
      setJobForm(emptyJobForm);
      setEditingJobId(null);
    } catch (error) {
      console.error("Job save failed:", error);
    }
  };

  const handleEditJob = (job) => {
    setEditingJobId(job.id);
    setJobForm({
      title: job.title,
      company: job.company,
      location: job.location,
      type: job.type,
      description: job.description,
      status: job.status,
    });
  };

  const handleCancelEdit = () => {
    setEditingJobId(null);
    setJobForm(emptyJobForm);
  };

  const handleDeleteJob = async (jobId) => {
    try {
      await api.delete(`/jobs/${jobId}`);
      setJobs((current) => current.filter((job) => job.id !== jobId));
      if (editingJobId === jobId) handleCancelEdit();
    } catch (error) {
      console.error("Job delete failed:", error);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-4 focus:ring-blue-100";

  return (
    <main className="bg-slate-50 px-4 py-8">
      <section className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-lg border border-slate-200 bg-slate-950 p-6 text-white shadow-xl md:p-8">
          <p className="mb-3 inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-teal-100">
            Jobs
          </p>
          <h1 className="text-3xl font-extrabold tracking-normal md:text-4xl">
            Explore opportunities posted by fellow alumni.
          </h1>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-300 md:text-base">
            Browse openings, referral-friendly roles, internships, and career
            leads shared by the CMRIT alumni network.
          </p>
          {loading && (
            <p className="mt-3 text-sm font-semibold text-teal-100">
              Loading jobs from database...
            </p>
          )}
        </div>

        {isAlumni && (
          <form
            onSubmit={handleSubmit}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6"
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-blue-50 text-blue-700">
                <FaPlus />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">
                  {editingJobId ? "Edit opportunity" : "Post an opportunity"}
                </h2>
                <p className="text-sm font-semibold text-slate-500">
                  {editingJobId
                    ? "Update this career opportunity."
                    : "Share a job, internship, or referral lead."}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <input
                name="title"
                value={jobForm.title}
                onChange={handleChange}
                placeholder="Job title"
                className={inputClass}
              />
              <input
                name="company"
                value={jobForm.company}
                onChange={handleChange}
                placeholder="Company"
                className={inputClass}
              />
              <input
                name="location"
                value={jobForm.location}
                onChange={handleChange}
                placeholder="Location"
                className={inputClass}
              />
              <select
                name="type"
                value={jobForm.type}
                onChange={handleChange}
                className={inputClass}
              >
                <option>Full-time</option>
                <option>Internship</option>
                <option>Contract</option>
                <option>Referral</option>
              </select>
              <select
                name="status"
                value={jobForm.status}
                onChange={handleChange}
                className={inputClass}
              >
                <option>Open</option>
                <option>Referral available</option>
                <option>New</option>
                <option>Closed</option>
              </select>
              <textarea
                name="description"
                value={jobForm.description}
                onChange={handleChange}
                rows="4"
                placeholder="Role details, skills, eligibility, or application link."
                className={`${inputClass} md:col-span-2`}
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="submit"
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 font-extrabold text-white transition hover:bg-blue-800"
              >
                <FaPaperPlane /> {editingJobId ? "Update Job" : "Save Job Post"}
              </button>
              {editingJobId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-lg border border-slate-300 px-5 font-extrabold text-slate-900 transition hover:border-slate-900"
                >
                  <FaTimes /> Cancel
                </button>
              )}
            </div>
          </form>
        )}

        <section className="grid gap-4 lg:grid-cols-3">
          {jobs.map((job) => (
            <article
              key={job.id}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="mb-3 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700">
                    {job.status}
                  </span>
                  <h2 className="text-xl font-extrabold text-slate-900">
                    {job.title}
                  </h2>
                  <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-500">
                    <FaBriefcase className="text-blue-700" /> {job.company} ·{" "}
                    {job.type}
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-500">
                    <FaMapMarkerAlt className="text-blue-700" />{" "}
                    {job.location || "Location not specified"}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm font-semibold leading-6 text-slate-500">
                {job.description || "No description added yet."}
              </p>
              {isAlumni ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => handleEditJob(job)}
                    className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 font-extrabold text-white transition hover:bg-blue-800"
                  >
                    <FaEdit /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteJob(job.id)}
                    className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 font-extrabold text-red-700 transition hover:bg-red-100"
                  >
                    <FaTrash /> Delete
                  </button>
                </div>
              ) : (
                <button className="mt-5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-extrabold text-slate-900 transition hover:border-slate-900">
                  View Details
                </button>
              )}
            </article>
          ))}
        </section>

        {!loading && !jobs.length && (
          <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
            <h2 className="text-2xl font-extrabold text-slate-900">
              No jobs posted yet
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Job opportunities will appear here once alumni post them.
            </p>
          </section>
        )}
      </section>
    </main>
  );
}

export default Jobs;

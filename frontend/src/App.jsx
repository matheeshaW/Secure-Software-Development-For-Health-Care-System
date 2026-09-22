import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";
import DashboardLayout from "./components/layout/DashboardLayout";
import AppointmentDetail from "./pages/appointment/appointmentDetail";
import BookAppointment from "./pages/appointment/bookAppointment";
import MyAppointments from "./pages/appointment/myAppointments";
import PrescriptionDetail from "./pages/prescription/PrescriptionDetail";
import DoctorDashboard from "./pages/doctor/DoctorDashboard";
import DoctorProfile from "./pages/doctor/DoctorProfile";
import ManageAvailability from "./pages/doctor/ManageAvailability";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MyReports from "./pages/patient/MyReports";
import PatientDashboard from "./pages/patient/PatientDashboard";
import PatientProfile from "./pages/patient/PatientProfile";
import ProtectedRoute from "./routes/ProtectedRoute";
import PaymentHistory from "./pages/patient/PaymentHistory"; // Only declare once

// Merged Imports: Both Telemedicine and Admin Pages
import VideoSession from './pages/telemedicine/VideoSession';
import TelemedicineDashboard from './pages/telemedicine/TelemedicineDashboard';
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminAppointments from "./pages/admin/AdminAppointments";
import UserList from "./pages/admin/UserList";
import DoctorVerification from "./pages/admin/DoctorVerification";
import GoogleCallback from "./pages/GoogleCallback";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/google/callback" element={<GoogleCallback />} />

        {/* Redirects */}
        <Route path="/profile" element={<Navigate to="/patient/profile" replace />} />
        <Route path="/reports" element={<Navigate to="/patient/reports" replace />} />
        <Route path="/appointments" element={<Navigate to="/appointment/my" replace />} />
        <Route path="/patient/appointments" element={<Navigate to="/appointment/my" replace />} />
        <Route path="/dashboard" element={<Navigate to="/home" replace />} />

        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Home />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Patient Routes */}
        <Route
          path="/patient/dashboard"
          element={
            <ProtectedRoute roles={["patient"]}>
              <DashboardLayout userRole="patient">
                <PatientDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/patient/profile"
          element={
            <ProtectedRoute roles={["patient"]}>
              <DashboardLayout userRole="patient">
                <PatientProfile />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/patient/reports"
          element={
            <ProtectedRoute roles={["patient"]}>
              <DashboardLayout userRole="patient">
                <MyReports />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Payment History Route (Keep this one) */}
        <Route
          path="/patient/payments"
          element={
            <ProtectedRoute roles={["patient"]}>
              <DashboardLayout userRole="patient">
                <PaymentHistory />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Appointment Routes */}
        <Route
          path="/appointment/book"
          element={
            <ProtectedRoute roles={["patient"]}>
              <DashboardLayout userRole="patient">
                <BookAppointment />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/appointment/my"
          element={
            <ProtectedRoute roles={["patient"]}>
              <DashboardLayout userRole="patient">
                <MyAppointments />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/appointment/:id"
          element={
            <ProtectedRoute roles={["patient"]}>
              <DashboardLayout userRole="patient">
                <AppointmentDetail />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Doctor Routes */}
        <Route
          path="/prescription/:appointmentId"
          element={
            <ProtectedRoute roles={["patient"]}>
              <DashboardLayout userRole="patient">
                <PrescriptionDetail />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/doctor/dashboard"
          element={
            <ProtectedRoute roles={["doctor"]}>
              <DashboardLayout userRole="doctor">
                <DoctorDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/doctor/profile"
          element={
            <ProtectedRoute roles={["doctor"]}>
              <DashboardLayout userRole="doctor">
                <DoctorProfile />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/doctor/availability"
          element={
            <ProtectedRoute roles={["doctor"]}>
              <DashboardLayout userRole="doctor">
                <ManageAvailability />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* <Route
          path="/doctor/prescriptions"
          element={
            <ProtectedRoute roles={["doctor"]}>
              <DashboardLayout userRole="doctor">
                <MyPrescriptions />
              </DashboardLayout>
            </ProtectedRoute>
          }
        /> */}

        {/* Telemedicine Routes */}
        <Route 
          path="/telemedicine" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <TelemedicineDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route path="/telemedicine/session/:id?" element={<ProtectedRoute><VideoSession /></ProtectedRoute>} />

        {/* Admin Routes */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute roles={["admin"]}>
              <DashboardLayout userRole="admin">
                <AdminDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/users"
          element={
            <ProtectedRoute roles={["admin"]}>
              <DashboardLayout userRole="admin">
                <UserList />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/verify-doctors"
          element={
            <ProtectedRoute roles={["admin"]}>
              <DashboardLayout userRole="admin">
                <DoctorVerification />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/appointments"
          element={
            <ProtectedRoute roles={["admin"]}>
              <DashboardLayout userRole="admin">
                <AdminAppointments />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={["admin"]}>
              <Navigate to="/admin/dashboard" replace />
            </ProtectedRoute>
          }
        />

        {/* 404 Catch-All */}
        <Route
          path="*"
          element={
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
              <div className="text-center space-y-4">
                <h1 className="text-6xl font-bold text-slate-900">404</h1>
                <p className="text-xl text-slate-600">Page not found</p>
                <Link
                  to="/login"
                  className="inline-block rounded-lg bg-cyan-600 px-6 py-3 font-semibold text-white transition hover:bg-cyan-700"
                >
                  Back to Login
                </Link>
              </div>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
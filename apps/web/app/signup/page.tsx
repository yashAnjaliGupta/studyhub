import LeftPanel from "../../components/signup/LeftPanel";
import SignupCard from "../../components/signup/SignupCard";

export default function SignupPage() {
    return (
        <main className="relative min-h-screen overflow-hidden bg-slate-50">
            {/* Background Decoration */}

            <div className="absolute inset-0 -z-10">
                <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-200/30 blur-3xl" />

                <div className="absolute right-0 top-0 h-[450px] w-[450px] rounded-full bg-cyan-200/30 blur-3xl" />

                <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-200/20 blur-3xl" />

                {/* Grid Pattern */}

                <div
                    className="
            absolute
            inset-0
            opacity-[0.03]
            [background-image:linear-gradient(#000_1px,transparent_1px),linear-gradient(90deg,#000_1px,transparent_1px)]
            [background-size:40px_40px]
          "
                />
            </div>

            {/* Layout */}

            <div
                className="
          mx-auto
          grid
          min-h-screen
          max-w-7xl
          lg:grid-cols-2
        "
            >
                {/* Left Branding Panel */}

                <LeftPanel />

                {/* Right Signup Section */}

                <section
                    className="
            flex
            items-center
            justify-center
            px-6
            py-10
            md:px-10
            lg:px-16
          "
                >
                    <SignupCard />
                </section>
            </div>
        </main>
    );
}
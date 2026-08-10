export default function BackgroundDecoration() {
    return (
        <>
            <div className="absolute left-10 top-20 h-48 w-48 rounded-full bg-blue-300/20 blur-3xl" />

            <div className="absolute right-20 top-52 h-40 w-40 rounded-full bg-cyan-300/20 blur-3xl" />

            <div className="absolute bottom-20 left-1/3 h-32 w-32 rounded-full bg-indigo-300/20 blur-3xl" />
        </>
    );
}
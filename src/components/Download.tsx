import { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import io from "socket.io-client";

const socket = io("https://youtubedownloader-backend.onrender.com");

interface VideoData {
  url: string;
  title: string;
  thumbnail: string;
  duration: number;
}

interface DownloadProgress {
  [url: string]: {
    progress: number;
    downloaded: string;
    total: string;
  };
}

const SkeletonLoader = () => (
  <div className="bg-gray-800 p-4 rounded-md shadow-xl shadow-green-600 animate-pulse">
    <div className="w-full h-40 bg-gray-700 mb-4" />
    <div className="h-6 bg-gray-700 mb-2" />
    <div className="h-4 bg-gray-700 mb-4" />
    <div className="flex justify-between">
      <div className="w-24 h-10 bg-gray-700 rounded-md" />
      <div className="w-24 h-10 bg-gray-700 rounded-md" />
    </div>
  </div>
);

function Download() {
  const [query, setQuery] = useState("");
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress>(
    {}
  );
  const [defaultDownloadPath, setDefaultDownloadPath] = useState<string | null>(
    null
  );
  const [isDownloading, setIsDownloading] = useState<{
    [url: string]: boolean;
  }>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Listen for download progress from the backend
    socket.on("download_progress", ({ url, progress, downloaded, total }) => {
      setDownloadProgress((prev) => ({
        ...prev,
        [url]: { progress, downloaded, total },
      }));
    });

    // Fetch the default download path when the component mounts
    const fetchDefaultDownloadPath = async () => {
      try {
        const response = await axios.get(
          "https://youtubedownloader-backend.onrender.com/get_default_download_path"
        );
        setDefaultDownloadPath(response.data.path);
      } catch (error) {
        console.error("Error fetching default download path:", error);
        toast.error(
          "Error getting default download location. Please choose manually."
        );
        // Optionally, you can prompt the user to select a path manually here
      }
    };

    fetchDefaultDownloadPath();

    return () => {
      socket.off("download_progress");
    };
  }, []);

  const searchVideos = async () => {
    setLoading(true); // Start loading
    try {
      const response = await axios.get(
        `https://youtubedownloader-backend.onrender.com/search?query=${encodeURIComponent(
          query
        )}`
      );
      setVideos(response.data);
      setLoading(false);
    } catch (error) {
      toast.error("Error searching videos.");
      console.error("Error searching videos:", error);
    }
  };

  const downloadMP4 = async (url: string) => {
    try {
      setIsDownloading((prev) => ({ ...prev, [url]: true }));

      const defaultPath = defaultDownloadPath;

      await axios.post(
        "https://youtubedownloader-backend.onrender.com/download/mp4",
        {
          url,
          path: defaultPath,
        }
      );
      setIsDownloading((prev) => ({ ...prev, [url]: false }));
      toast.success("Download completed");
    } catch (error) {
      setIsDownloading((prev) => ({ ...prev, [url]: false }));
      toast.error("Error downloading MP4.");
      console.error("Error downloading MP4:", error);
    }
  };

  const downloadMP3 = async (url: string) => {
    try {
      setIsDownloading((prev) => ({ ...prev, [url]: true }));
      const defaultPath = defaultDownloadPath;

      await axios.post(
        "https://youtubedownloader-backend.onrender.com/download/mp3",
        {
          url,
          path: defaultPath,
        }
      );
      setIsDownloading((prev) => ({ ...prev, [url]: false }));
      toast.success("Download completed");
    } catch (error) {
      setIsDownloading((prev) => ({ ...prev, [url]: false }));
      toast.error("Error downloading MP3.");
      console.error("Error downloading MP3:", error);
    }
  };

  return (
    <div className="bg-gray-900 min-h-screen text-white p-6">
      <h1 className="text-3xl font-bold mb-4 text-center">Mayodownloader</h1>

      <div className="flex justify-center mb-6">
        <input
          className="bg-gray-700 text-white p-2 rounded-l-md w-96"
          type="text"
          placeholder="Search for videos..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          onClick={searchVideos}
          className="bg-blue-600 hover:bg-blue-700 p-2 rounded-r-md"
        >
          Search
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {loading
          ? Array.from({ length: 15 }).map((_, idx) => (
              <SkeletonLoader key={idx} />
            )) // Render 6 skeletons during loading
          : videos.map((video) => (
              <div
                key={video.url}
                className="bg-gray-800 p-4 rounded-md shadow-xl shadow-green-600 flex flex-col justify-between relative"
              >
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-40 object-cover mb-4"
                />
                <h2 className="text-xl font-semibold">{video.title}</h2>
                <p className="text-gray-400 mb-4">
                  Duration: {Math.floor(video.duration / 60)}:
                  {String(video.duration % 60).padStart(2, "0")} minutes
                </p>
                <div className="flex justify-between text-sm">
                  <button
                    onClick={() => downloadMP4(video.url)}
                    disabled={isDownloading[video.url]}
                    className={`p-2 rounded-md ${
                      isDownloading[video.url]
                        ? "bg-gray-500 cursor-not-allowed"
                        : "bg-green-500 hover:bg-green-600"
                    }`}
                  >
                    {isDownloading[video.url]
                      ? "Downloading..."
                      : "Download MP4"}
                  </button>
                  <button
                    onClick={() => downloadMP3(video.url)}
                    disabled={isDownloading[video.url]}
                    className={`p-2 rounded-md ${
                      isDownloading[video.url]
                        ? "bg-gray-500 cursor-not-allowed"
                        : "bg-red-500 hover:bg-red-600"
                    }`}
                  >
                    {isDownloading[video.url]
                      ? "Downloading..."
                      : "Download MP3"}
                  </button>
                </div>
                {/* Show download progress if available */}
                {isDownloading[video.url] && downloadProgress[video.url] && (
                  <div className="absolute top-10 left-[22px] bg-opacity-70 bg-black pt-10 pb-10 px-3 rounded-xl">
                    <div className="bg-gray-600 h-4 rounded-md">
                      <div
                        className="bg-green-500 h-full rounded-md"
                        style={{
                          width: `${downloadProgress[video.url].progress}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-white font-extrabold mt-1">
                      Downloaded: {downloadProgress[video.url].downloaded} of{" "}
                      {downloadProgress[video.url].total}
                    </p>
                  </div>
                )}
              </div>
            ))}
      </div>

      {/* Toast container for displaying notifications */}
      <ToastContainer />
    </div>
  );
}

export default Download;

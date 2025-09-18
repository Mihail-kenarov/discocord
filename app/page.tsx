import Image from "next/image";

export default function Home() {
  return (
    <div className="flex justify-center items-center h-screen">
      <Image
        src="/landing_landscape.jpg"
        alt="Landing Landscape"
        width={1920}
        height={1080}
        className="object-cover"
      />
    </div>





  );
}

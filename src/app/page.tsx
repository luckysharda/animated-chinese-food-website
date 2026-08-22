import SmoothScroll from "@/lib/lenis";
import Chrome from "@/components/chrome/Chrome";
import Hero from "@/components/hero/Hero";
import Lineup from "@/components/sections/Lineup";
import BuildYourRamen from "@/components/sections/BuildYourRamen";
import Steam from "@/components/sections/Steam";
import Simmer from "@/components/sections/Simmer";
import Ingredients from "@/components/sections/Ingredients";
import Craft from "@/components/sections/Craft";
import Story from "@/components/sections/Story";
import Order from "@/components/sections/Order";
import Footer from "@/components/sections/Footer";

/**
 * The whole page, in order.
 *
 * SmoothScroll wraps everything: Lenis owns the scroll position and drives
 * ScrollTrigger, so every scrubbed section below must sit inside it. Chrome is
 * the fixed instrument layer and is rendered first so it composites above the
 * content. Hero carries its own 500dvh track + sticky stage and its own
 * next/dynamic({ ssr: false }) import of the three.js bowl, so it needs no
 * wrapper here.
 */
export default function Home() {
  return (
    <SmoothScroll>
      <Chrome />
      <main>
        <Hero />
        <Lineup />
        <BuildYourRamen />
        <Steam />
        <Simmer />
        <Ingredients />
        <Craft />
        <Story />
        <Order />
      </main>
      <Footer />
    </SmoothScroll>
  );
}

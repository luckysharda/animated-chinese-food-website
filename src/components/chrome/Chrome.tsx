import Nav from "./Nav";
import StatusPill from "./StatusPill";
import CentreReadout from "./CentreReadout";
import Telemetry from "./Telemetry";
import ProgressRail from "./ProgressRail";
import Grain from "./Grain";
import HeroReadouts from "./HeroReadouts";

/**
 * Chrome — the whole fixed instrument layer in one mount.
 * Everything in here lives in the INSTRUMENT FRAME (12px left inset,
 * 4.8vw right inset) and ignores the content container entirely.
 * Everything is pointer-events-none except the nav links.
 * The three live readouts are hero-scoped (see HeroReadouts) — they sit over
 * photography, not over typography, so they leave with the hero.
 * Grain is rendered last so it lies over the readouts as well as the page.
 */
export default function Chrome(): React.ReactElement {
  return (
    <>
      <Nav />
      <HeroReadouts>
        <StatusPill />
        <CentreReadout />
        <Telemetry />
      </HeroReadouts>
      <ProgressRail />
      <Grain />
    </>
  );
}

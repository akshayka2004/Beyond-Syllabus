import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  BridgeIllustration,
  CrowdBanner,
  SunriseCrowd,
} from "@/components/illustrations";
import {
  Search,
  FileText,
  Users,
  MessagesSquare,
  Presentation,
  ArrowRight,
} from "lucide-react";

const MANIFESTO = [
  {
    n: "1",
    title: "We Refuse.",
    body: "To be part of a world where curiosity is restricted, ideas are ignored, and people are forced to fit into structures instead of being empowered to transform them. Because humanity was never meant to create copies. It was meant to create creators.",
    featured: true,
  },
  {
    n: "2",
    title: "Why We Exist.",
    body: "We exist to bridge gaps between education and skills, knowledge and action, potential and opportunity, the world we have and the one we deserve. These gaps aren't barriers, but invitations to build better.",
  },
  {
    n: "3",
    title: "Why Now.",
    body: "The world is changing faster than ever. Emerging technologies demand new thinking. The future isn't for those who follow, it's for those who question, imagine, experiment, and create. The time to rethink is now.",
  },
];

const STEPS = [
  { icon: Search, label: ["Documenting", "The Gaps"], href: "/select" },
  { icon: FileText, label: ["Drafting A Real", "Framework"], href: "/notebook" },
  { icon: Users, label: ["Building Public", "Support"], href: "/journey" },
  { icon: MessagesSquare, label: ["Creating", "Communities"], href: "/teach" },
  { icon: Presentation, label: ["Presenting It", "Where It Matters"], href: "/select" },
];

const ASKS = [
  {
    title: "Share Your Suggestions",
    body: "No Movement Becomes Successful Without The Words And Thoughts From Its Members.",
  },
  {
    title: "Share The Movement",
    body: "Help This Reach The People, Institutions, And Platforms Where It Can Create Pressure For Real Change.",
  },
  {
    title: "Stay Engaged",
    body: "This Is Not A One Time Signature. Real Policy Change Takes Sustained Attention, And We Will Need People Who Stay Through The Whole Process.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main id="top">
        {/* Hero */}
        <section className="bs-hero">
          <div className="bs-wrap">
            <h1>
              You Made Power Listen.
              <br />
              Now Let&apos;s Build The System.
            </h1>
            <div className="bs-btn-row" style={{ marginBottom: 20 }}>
              <Link href="/notebook" className="btn-pledge btn-pledge-solid">Open a Notebook</Link>
              <a href="#manifesto" className="btn-pledge">Read the Manifesto</a>
            </div>
          </div>
          <div className="bs-art">
            <BridgeIllustration className="mx-auto w-full" />
          </div>
        </section>

        {/* Manifesto */}
        <section className="bs-manifesto" id="manifesto">
          <div className="bs-wrap">
            <h2>For Those Who Dare To Build Beyond Boundaries</h2>
            <ol>
              {MANIFESTO.map((m) => (
                <li key={m.n} className={`bs-mrow${m.featured ? " bs-mrow--featured" : ""}`}>
                  <span className="bs-mnum">{m.n}</span>
                  <h3 className="bs-mtitle">{m.title}</h3>
                  <p className="bs-mbody">{m.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* How we are doing this */}
        <section className="bs-how">
          <div className="bs-wrap">
            <h2>HOW WE ARE DOING THIS</h2>
            <p className="bs-sub">We are building the bridge ourselves, piece by piece</p>

            <div className="bs-steps">
              {STEPS.map(({ icon: Icon, label, href }) => (
                <Link key={label.join(" ")} href={href} className="bs-step group">
                  <div className="bs-step-inner">
                    <Icon className="bs-step-icon" width={26} height={26} strokeWidth={1.3} />
                    <p className="bs-step-label">
                      {label[0]}
                      <br />
                      {label[1]}
                    </p>
                    <span className="bs-step-go">
                      <ArrowRight width={12} height={12} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            <p className="bs-quote">
              Every project created, every skill shared, every voice added becomes part of that bridge.
            </p>
          </div>
        </section>

        {/* Pledge */}
        <section className="bs-pledge" id="pledge">
          <div className="bs-wrap">
            <div className="bs-pledge-card">
              <h2>
                The <span>Beyond Syllabus</span> Pledge
              </h2>
              <p className="bs-pledge-text">
                I Pledge To Stand For A System Built On Transparency, Accountability, And
                Real Opportunity. I Pledge To Turn Curiosity Into Action, Ideas Into
                Impact, And Challenges Into Opportunities. I Pledge To Learn Beyond
                Boundaries, Create With Responsibility, Collaborate Openly, And Contribute
                To The Greater Good That Empowers All To Grow Together. I Add My Name To
                Become Part Of A Movement. Together, We Will Build A Future That Gives
                Confidence To The Curious, Network To The Bold, And Direction To The
                Determined.
              </p>
              <div className="bs-art">
                <CrowdBanner className="mx-auto w-full max-w-[560px]" />
              </div>
            </div>
          </div>
        </section>

        {/* What we ask */}
        <section className="bs-ask">
          <div className="bs-wrap">
            <h2>WHAT WE ASK FROM YOU</h2>
            <div className="bs-ask-list">
              {ASKS.map((a) => (
                <div key={a.title} className="bs-ask-row">
                  <h3>{a.title}</h3>
                  <p>{a.body}</p>
                </div>
              ))}
            </div>
            <div className="bs-btn-row" style={{ marginTop: 20 }}>
              <Link href="/select" className="btn-pledge btn-pledge-solid">Rise Together</Link>
            </div>
          </div>
        </section>

        {/* Join */}
        <section className="bs-join" id="join">
          <div className="bs-wrap">
            <h2>JOIN THE MOVEMENT</h2>
            <p className="bs-join-lines">
              We Were Taught To Fit Into Systems.
              <br />
              We Choose To Build Better Ones.
              <br />
              We Do Not Wait For Permission. We Do Not Wait For Perfect Conditions.
              <br />
              We Begin. One Idea. One Creator. One Pledge. One Movement.
            </p>
            <p className="bs-join-tag">Beyond Syllabus. Beyond Boundaries. Beyond Limits.</p>
            <div className="bs-btn-row" style={{ marginBottom: 20 }}>
              <Link href="/notebook" className="btn-pledge btn-pledge-solid">Open a Notebook</Link>
              <Link href="/select" className="btn-pledge">Explore the Syllabus</Link>
            </div>
          </div>
          <div className="bs-art">
            <SunriseCrowd className="mx-auto w-full" />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

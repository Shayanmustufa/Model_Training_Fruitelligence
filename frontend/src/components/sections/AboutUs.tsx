"use client";

import React from "react";
import { AlertTriangle, ShieldCheck, Quote, Github, Mail, Linkedin } from "lucide-react";
import { useTranslations } from "next-intl";
import SectionWrapper from "../layout/SectionWrapper";
import Container from "../layout/Container";
import { useLiveDemo } from "../layout/LiveDemoLayout";

interface TeamMember {
  name: string;
  role: string;
  avatarPlaceholder: string;
  bio: string;
  email: string;
  github: string;
  linkedin: string;
}

export default function AboutUs() {
  const { isLiveDemo } = useLiveDemo();
  const t = useTranslations("aboutUs");
  const team: TeamMember[] = [
    {
      name: "Abdul Qadir Satti",
      role: t("team.abdul.role"),
      avatarPlaceholder: "/placeholder-abdul-qadir.jpg",
      bio: t("team.abdul.bio"),
      email: "abdulqadirsatti772@gmail.com",
      github: "https://github.com/AbdulQadir152",
      linkedin: "https://linkedin.com/in/abdul-qadirsatti",
    },
    {
      name: "Syed Shayan Mustufa Rizvi",
      role: t("team.shayan.role"),
      avatarPlaceholder: "/placeholder-shayan.jpg",
      bio: t("team.shayan.bio"),
      email: "shayan710rm@gmail.com",
      github: "https://github.com/Shayanmustufa",
      linkedin: "https://www.linkedin.com/in/syed-shayan-mustufa-rizvi-796a04268",
    },
    {
      name: "Arfeen Ahmed Siddiqui",
      role: t("team.arfeen.role"),
      avatarPlaceholder: "/placeholder-arfeen.jpg",
      bio: t("team.arfeen.bio"),
      email: "siddiquiarfeenahmed@gmail.com",
      github: "https://github.com/decryptedsoul",
      linkedin: "https://www.linkedin.com/in/arfeen-ahmed-siddiqui-8842a92ba/",
    },
  ];

  return (
    <SectionWrapper id="about-us" className="py-24 bg-background-light relative">
      <Container>
        {/* Core Mission */}
        <div className="max-w-4xl mx-auto text-center mb-20 bg-primary/5 border border-primary/10 rounded-[32px] p-8 md:p-12 relative overflow-hidden">
          <div className="absolute top-4 start-6 text-primary/10 select-none">
            <Quote className="h-16 w-16 rtl:scale-x-[-1]" />
          </div>

          <p className="font-body text-xs font-bold text-accent uppercase tracking-widest relative z-10">{t("missionLabel")}</p>
          <h3 className="font-display font-semibold text-xl md:text-2xl text-primary max-w-2xl mx-auto mt-4 leading-relaxed relative z-10">
            {t("missionText")}
          </h3>
        </div>

        {/* Problem vs Vision Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-24 max-w-5xl mx-auto">
          {/* Problem */}
          <div className="bg-white border border-destructive/15 rounded-2xl p-8 shadow-sm">
            <div className="bg-destructive/10 w-12 h-12 rounded-xl flex items-center justify-center border border-destructive/20 mb-6">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <h3 className="font-display font-semibold text-xl text-primary">{t("challengesTitle")}</h3>
            <div className="mt-4 flex flex-col gap-4 font-body text-sm text-foreground-muted leading-relaxed">
              <p>
                <strong>{t("challenge1Title")}</strong>{t("challenge1Text")}
              </p>
              <p>
                <strong>{t("challenge2Title")}</strong>{t("challenge2Text")}
              </p>
              <p>
                <strong>{t("challenge3Title")}</strong>{t("challenge3Text")}
              </p>
            </div>
          </div>

          {/* Vision */}
          <div className="bg-white border border-primary/15 rounded-2xl p-8 shadow-sm">
            <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center border border-primary/20 mb-6">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-display font-semibold text-xl text-primary">{t("solutionsTitle")}</h3>
            <div className="mt-4 flex flex-col gap-4 font-body text-sm text-foreground-muted leading-relaxed">
              <p>
                <strong>{t("solution1Title")}</strong>{t("solution1Text")}
              </p>
              <p>
                <strong>{t("solution2Title")}</strong>{t("solution2Text")}
              </p>
              <p>
                <strong>{t("solution3Title")}</strong>{t("solution3Text")}
              </p>
            </div>
          </div>
        </div>

        {/* Meet the Team */}
        <div>
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="font-body text-xs font-bold text-accent uppercase tracking-widest">{t("creatorsLabel")}</p>
            <h2 className="font-display font-bold text-3xl text-primary mt-2">{t("teamTitle")}</h2>
            <p className="font-body text-sm text-foreground-muted mt-3">
              {t("teamDesc")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {team.map((member) => (
              <div
                key={member.name}
                className="bg-white border border-border/10 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center text-center"
              >
                {/* Avatar Placeholder */}
                <div className="relative w-24 h-24 rounded-full overflow-hidden mb-5 bg-primary/5 border border-border/10 shrink-0">
                  <img
                    src={member.avatarPlaceholder}
                    alt={member.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback if image path fails
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>

                <h3 className="font-display font-bold text-lg text-primary">{member.name}</h3>
                <p className="font-body text-xs text-accent font-semibold uppercase tracking-wider mt-1">
                  {member.role}
                </p>
                {!isLiveDemo && (
                  <p className="font-body text-xs text-foreground-muted mt-3.5 leading-relaxed">
                    {member.bio}
                  </p>
                )}

                {/* Contact Links */}
                <div className="mt-5 flex items-center gap-4">
                  <a
                    href={`mailto:${member.email}`}
                    className="text-primary hover:text-accent transition-colors cursor-pointer"
                    aria-label={`Email ${member.name}`}
                    title={member.email}
                  >
                    <Mail className="h-5 w-5" />
                  </a>
                  <a
                    href={member.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-accent transition-colors cursor-pointer"
                    aria-label={`${member.name}'s GitHub`}
                  >
                    <Github className="h-5 w-5" />
                  </a>
                  <a
                    href={member.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-accent transition-colors cursor-pointer"
                    aria-label={`${member.name}'s LinkedIn`}
                  >
                    <Linkedin className="h-5 w-5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </SectionWrapper>
  );
}

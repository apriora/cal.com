"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import { MembershipRole } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Button, Meta, TextField } from "@calcom/ui";

import { useInViewObserver } from "@lib/hooks/useInViewObserver";

import { getLayout } from "../../../settings/layouts/SettingsLayout";
import DisableTeamImpersonation from "../components/DisableTeamImpersonation";
import InviteLinkSettingsModal from "../components/InviteLinkSettingsModal";
import MakeTeamPrivateSwitch from "../components/MakeTeamPrivateSwitch";
import { MemberInvitationModalWithoutMemebers } from "../components/MemberInvitationModal";
import MemberListItem from "../components/MemberListItem";
import TeamInviteList from "../components/TeamInviteList";

type Team = RouterOutputs["viewer"]["teams"]["getTeamWithMinimalData"];

interface MembersListProps {
  team: Team | undefined;
  isOrgAdminOrOwner: boolean | undefined;
}

function MembersList(props: MembersListProps) {
  const { team, isOrgAdminOrOwner } = props;
  const { t } = useLocale();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const { data, isFetching, status, fetchNextPage, isFetchingNextPage, hasNextPage } =
    trpc.viewer.teams.lazyLoadMembers.useInfiniteQuery(
      {
        limit: 10,
        searchTerm: debouncedSearchTerm,
        teamId: team?.id ?? 0,
      },
      {
        enabled: !!team?.id,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        placeholderData: keepPreviousData,
        refetchOnWindowFocus: true,
        staleTime: 1 * 60 * 60 * 1000,
      }
    );

  const buttonInView = useInViewObserver(() => {
    if (!isFetching && hasNextPage && status === "success") {
      fetchNextPage();
    }
  }, null);

  return (
    <div className="flex flex-col gap-y-3">
      <TextField
        type="search"
        autoComplete="false"
        onChange={(e) => setSearchTerm(e.target.value)}
        value={searchTerm}
        placeholder={`${t("search")}...`}
      />
      {data?.pages[0]?.members?.length && team ? (
        <ul
          className="divide-subtle border-subtle divide-y rounded-md border "
          data-testId="team-member-list-container">
          {data.pages?.map((page) => {
            return page.members.map((member) => {
              return (
                <MemberListItem
                  key={member.id}
                  team={team}
                  member={member}
                  isOrgAdminOrOwner={isOrgAdminOrOwner}
                  searchTerm={debouncedSearchTerm}
                />
              );
            });
          })}
        </ul>
      ) : null}
      <div className="text-default p-4 text-center" ref={buttonInView.ref}>
        <Button
          color="minimal"
          loading={isFetchingNextPage}
          disabled={!hasNextPage}
          onClick={() => fetchNextPage()}>
          {hasNextPage ? t("load_more_results") : t("no_more_results")}
        </Button>
      </div>
    </div>
  );
}

const MembersView = () => {
  const searchParams = useCompatSearchParams();
  const { t } = useLocale();

  const router = useRouter();
  const session = useSession();
  const org = session?.data?.user.org;

  const params = useParamsWithFallback();

  const teamId = Number(params.id);

  const showDialog = searchParams?.get("inviteModal") === "true";
  const [showMemberInvitationModal, setShowMemberInvitationModal] = useState(showDialog);
  const [showInviteLinkSettingsModal, setInviteLinkSettingsModal] = useState(false);

  const {
    data: team,
    isPending: isTeamsLoading,
    error: teamError,
  } = trpc.viewer.teams.getTeamWithMinimalData.useQuery(
    { teamId },
    {
      enabled: !!teamId,
    }
  );

  useEffect(
    function refactorMeWithoutEffect() {
      if (teamError) {
        router.replace("/teams");
      }
    },
    [teamError]
  );

  const isPending = isTeamsLoading;

  const isInviteOpen = !team?.membership.accepted;

  const isAdmin =
    team && (team.membership.role === MembershipRole.OWNER || team.membership.role === MembershipRole.ADMIN);

  const isOrgAdminOrOwner = org?.role === MembershipRole.OWNER || org?.role === MembershipRole.ADMIN;

  const hideInvitationModal = () => {
    setShowMemberInvitationModal(false);
  };

  return (
    <>
      <Meta
        title={t("team_members")}
        description={t("members_team_description")}
        CTA={
          isAdmin || isOrgAdminOrOwner ? (
            <Button
              type="button"
              color="primary"
              StartIcon="plus"
              className="ml-auto"
              onClick={() => setShowMemberInvitationModal(true)}
              data-testid="new-member-button">
              {t("add")}
            </Button>
          ) : (
            <></>
          )
        }
      />
      {!isPending && (
        <>
          <div>
            {team && (
              <>
                {isInviteOpen && (
                  <TeamInviteList
                    teams={[
                      {
                        id: team.id,
                        accepted: team.membership.accepted || false,
                        name: team.name,
                        slug: team.slug,
                        role: team.membership.role,
                      },
                    ]}
                  />
                )}
              </>
            )}

            {((team?.isPrivate && isAdmin) || !team?.isPrivate || isOrgAdminOrOwner) && (
              <>
                <MembersList team={team} isOrgAdminOrOwner={isOrgAdminOrOwner} />
              </>
            )}

            {team && team.id && session.data && (
              <DisableTeamImpersonation
                teamId={team.id}
                memberId={session.data.user.id}
                disabled={isInviteOpen}
              />
            )}

            {team && team.id && (isAdmin || isOrgAdminOrOwner) && (
              <MakeTeamPrivateSwitch
                isOrg={false}
                teamId={team.id}
                isPrivate={team.isPrivate ?? false}
                disabled={isInviteOpen}
              />
            )}
          </div>
          {showMemberInvitationModal && team && team.id && (
            <MemberInvitationModalWithoutMemebers
              hideInvitationModal={hideInvitationModal}
              showMemberInvitationModal={showMemberInvitationModal}
              teamId={team.id}
              token={team.inviteToken?.token}
              onSettingsOpen={() => setInviteLinkSettingsModal(true)}
            />
          )}

          {showInviteLinkSettingsModal && team?.inviteToken && team.id && (
            <InviteLinkSettingsModal
              isOpen={showInviteLinkSettingsModal}
              teamId={team.id}
              token={team.inviteToken.token}
              expiresInDays={team.inviteToken.expiresInDays || undefined}
              onExit={() => {
                setInviteLinkSettingsModal(false);
                setShowMemberInvitationModal(true);
              }}
            />
          )}
        </>
      )}
    </>
  );
};

MembersView.getLayout = getLayout;

export default MembersView;

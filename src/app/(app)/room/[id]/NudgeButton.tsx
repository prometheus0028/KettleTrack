"use client";

import { useState, useTransition } from "react";
import { Bell, X, Check } from "lucide-react";
import { getPredictedTurn, nudgeUserForSubgroup } from "./actions";

type User = {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
};

export function NudgeButton({
  roomId,
  activeMembers,
  currentUserId,
}: {
  roomId: string;
  activeMembers: User[];
  currentUserId: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(
    new Set(activeMembers.map((m) => m.id)),
  );
  const [predictedTurnUser, setPredictedTurnUser] = useState<User | null>(null);

  const [loadingTurn, setLoadingTurn] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);

  const toggleUser = (userId: string) => {
    const newSet = new Set(selectedUsers);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedUsers(newSet);
  };

  const handleNext = async () => {
    if (selectedUsers.size < 2) return;
    setLoadingTurn(true);
    try {
      const user = await getPredictedTurn(roomId, Array.from(selectedUsers));
      setPredictedTurnUser(user);
      setStep(2);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTurn(false);
    }
  };

  const handleNudge = () => {
    if (!predictedTurnUser) return;

    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setIsOpen(false);
      setStep(1);
    }, 1500);

    startTransition(() => {
      nudgeUserForSubgroup(predictedTurnUser.id, roomId, "");
    });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 whitespace-nowrap border border-[var(--border)] px-5 py-2 rounded-full text-sm font-medium transition-all text-[var(--foreground)] hover:bg-[var(--secondary)] active:scale-[0.98]"
      >
        <Bell className="w-4 h-4 text-[#ff652f]" />
        Nudge
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--background)] w-full max-w-md rounded-2xl overflow-hidden shadow-xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <h3 className="text-lg font-semibold text-[var(--foreground)]">
                {step === 1 ? "Who used the kettle?" : "Confirm Nudge"}
              </h3>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setStep(1);
                }}
                className="p-2 -mr-2 rounded-full hover:bg-[var(--secondary)] text-[var(--muted-foreground)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {step === 1 ? (
                <div className="space-y-2">
                  <p className="text-sm text-[var(--muted-foreground)] mb-4">
                    Who was in this round? We'll figure out whose turn it is to
                    nudge.
                  </p>
                  {activeMembers.map((member) => {
                    const isSelected = selectedUsers.has(member.id);
                    return (
                      <button
                        key={member.id}
                        onClick={() => toggleUser(member.id)}
                        className="w-full flex items-center justify-between py-3 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-[var(--secondary)] border border-[var(--border)]">
                            {member.avatarUrl ? (
                              <img
                                src={member.avatarUrl}
                                alt=""
                                className="w-full h-full object-cover p-0.5 rounded-full"
                              />
                            ) : (
                              <span className="text-xs font-bold text-[var(--muted-foreground)] flex items-center justify-center h-full">
                                {member.name
                                  ? member.name.charAt(0).toUpperCase()
                                  : member.email.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <span className="font-medium text-[var(--foreground)]">
                            {member.id === currentUserId
                              ? "You"
                              : member.name || member.email.split("@")[0]}
                          </span>
                        </div>
                        <div
                          className={`w-6 h-6 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? "bg-[#1cc29f] border-[#1cc29f] text-white"
                              : "border-[var(--border)] text-transparent"
                          }`}
                        >
                          <Check className="w-4 h-4" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  {predictedTurnUser && (
                    <div className="bg-[#1cc29f]/10 text-[#1cc29f] p-4 rounded-xl border border-[#1cc29f]/20 flex flex-col items-center justify-center text-center">
                      <p className="text-sm font-medium mb-1">We think it's</p>
                      <p className="text-xl font-bold mb-2">
                        {predictedTurnUser.id === currentUserId
                          ? "Your"
                          : (predictedTurnUser.name ||
                              predictedTurnUser.email.split("@")[0]) +
                            "'s"}{" "}
                        Turn
                      </p>
                      {predictedTurnUser.id !== currentUserId && (
                        <p className="text-sm opacity-80">
                          Do you want to send them a nudge?
                        </p>
                      )}
                    </div>
                  )}

                  {predictedTurnUser?.id === currentUserId && (
                    <p className="text-center text-sm text-[var(--muted-foreground)] mt-4">
                      You can't really nudge yourself! Go wash it!
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[var(--border)]">
              {step === 1 ? (
                <button
                  onClick={handleNext}
                  disabled={selectedUsers.size < 2 || loadingTurn}
                  className="w-full bg-[#1cc29f] text-white py-3 rounded-xl font-semibold disabled:opacity-50 transition-opacity"
                >
                  {loadingTurn ? "Checking..." : "Next"}
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 bg-[var(--secondary)] text-[var(--foreground)] py-3 rounded-xl font-semibold transition-opacity hover:opacity-80"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleNudge}
                    disabled={
                      isPending ||
                      success ||
                      predictedTurnUser?.id === currentUserId
                    }
                    className={`flex-[2] text-white py-3 rounded-xl font-semibold disabled:opacity-50 transition-all ${
                      success ? "bg-[#1cc29f]" : "bg-[#ff652f]"
                    }`}
                  >
                    {success
                      ? "Nudged!"
                      : isPending
                        ? "Sending..."
                        : "Send Nudge"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

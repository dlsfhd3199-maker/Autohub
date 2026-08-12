import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/registration/actions", () => ({
  submitRegistration: vi.fn(async () => ({ ok: false, message: "" })),
}));

import { RegistrationForm } from "./registration-form";

afterEach(cleanup);

describe("RegistrationForm", () => {
  it("광고주 필드를 명확한 레이블과 독립적인 비밀번호 토글로 제공한다", () => {
    render(<RegistrationForm />);

    expect(screen.getByLabelText("회사명")).toBeInTheDocument();
    expect(screen.getByLabelText("브랜드명")).toBeInTheDocument();
    expect(screen.getByLabelText("자사몰 URL")).toBeInTheDocument();
    expect(screen.getByLabelText("비밀번호")).toHaveAttribute("type", "password");
    expect(screen.getByLabelText("비밀번호 확인")).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByRole("button", { name: "비밀번호 표시" }));
    expect(screen.getByLabelText("비밀번호")).toHaveAttribute("type", "text");
    expect(screen.getByLabelText("비밀번호 확인")).toHaveAttribute("type", "password");
  });

  it("마케터 가입 코드를 비밀번호 입력으로 제공한다", () => {
    render(<RegistrationForm />);
    fireEvent.click(screen.getByRole("tab", { name: "마케터" }));

    const joinCode = screen.getByLabelText("가입 코드");
    expect(joinCode).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "가입 코드 표시" }));
    expect(joinCode).toHaveAttribute("type", "text");
    expect(screen.getByRole("tab", { name: "마케터" })).toHaveAttribute("aria-selected", "true");
  });
});

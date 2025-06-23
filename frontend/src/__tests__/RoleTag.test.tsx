import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { RoleTag } from "../components/ui/RoleTag";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "family.admin": "Admin",
        "family.member": "Member", 
        "family.isVirtual": "Virtual Member",
      };
      return translations[key] || key;
    },
  }),
}));

describe("RoleTag", () => {
  it("renders admin role correctly", () => {
    render(<RoleTag role="ADMIN" />);
    
    const tag = screen.getByText("Admin");
    expect(tag).toBeInTheDocument();
    expect(tag).toHaveClass("role-tag", "role-tag-admin");
  });

  it("renders member role correctly", () => {
    render(<RoleTag role="MEMBER" />);
    
    const tag = screen.getByText("Member");
    expect(tag).toBeInTheDocument();
    expect(tag).toHaveClass("role-tag", "role-tag-member");
  });

  it("renders virtual member role correctly", () => {
    render(<RoleTag role="VIRTUAL" />);
    
    const tag = screen.getByText("Virtual Member");
    expect(tag).toBeInTheDocument();
    expect(tag).toHaveClass("role-tag", "role-tag-virtual");
  });

  it("applies custom className", () => {
    render(<RoleTag role="ADMIN" className="custom-class" />);
    
    const tag = screen.getByText("Admin");
    expect(tag).toHaveClass("role-tag", "role-tag-admin", "custom-class");
  });
});

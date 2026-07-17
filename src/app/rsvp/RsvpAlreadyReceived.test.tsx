// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RsvpAlreadyReceived } from "./RsvpAlreadyReceived";

afterEach(cleanup);

describe("RsvpAlreadyReceived", () => {
  it("confirms receipt and gives Guests the alterations email", () => {
    render(<RsvpAlreadyReceived />);

    expect(screen.getByRole("status")).toHaveTextContent(
      /already received your RSVP/
    );
    const link = screen.getByRole("link", {
      name: "bottarini.ryan@gmail.com",
    });
    expect(link).toHaveAttribute("href", "mailto:bottarini.ryan@gmail.com");
    expect(screen.queryByRole("button", { name: /send rsvp/i })).toBeNull();
  });
});

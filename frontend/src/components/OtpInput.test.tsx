import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OtpInput } from "./OtpInput.tsx";

// Keeps the value in state so the component behaves as it does inside a page.
function Harness({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <OtpInput value={value} onChange={setValue} />
      <output data-testid='value'>{value}</output>
    </>
  );
}

const boxes = () => screen.getAllByRole("textbox");
const current = () => screen.getByTestId("value").textContent;

describe("OtpInput", () => {
  it("renders six labelled digit boxes", () => {
    render(<Harness />);
    expect(boxes()).toHaveLength(6);
    // aria-label text is matched by getByLabelText (Testing Library, 2026a).
    expect(screen.getByLabelText("Verification code, digit 1 of 6")).toBeInTheDocument();
    expect(screen.getByLabelText("Verification code, digit 6 of 6")).toBeInTheDocument();
  });

  it("moves forward as digits are typed", async () => {
    render(<Harness />);
    await userEvent.click(boxes()[0]);
    await userEvent.keyboard("123456");
    expect(current()).toBe("123456");
    expect(boxes()[5]).toHaveValue("6");
  });

  it("ignores letters and symbols", async () => {
    render(<Harness />);
    await userEvent.click(boxes()[0]);
    await userEvent.keyboard("a1-b2");
    expect(current()).toBe("12");
  });

  it("fills every box from a pasted code", async () => {
    render(<Harness />);
    await userEvent.click(boxes()[0]);
    // paste inserts text into the focused element (Testing Library, 2026b).
    await userEvent.paste("482 915");
    expect(current()).toBe("482915");
  });

  it("drops anything beyond six digits when pasting", async () => {
    render(<Harness />);
    await userEvent.click(boxes()[0]);
    await userEvent.paste("1234567890");
    expect(current()).toBe("123456");
  });

  it("steps back and removes the previous digit on backspace in an empty box", async () => {
    render(<Harness initial='12' />);
    await userEvent.click(boxes()[2]);
    await userEvent.keyboard("{Backspace}");
    expect(current()).toBe("1");
  });
});

// Reference List:
// Testing Library, 2026a. ByLabelText. [online] Available at: <https://testing-library.com/docs/queries/bylabeltext> [Accessed 10 October 2026].
// Testing Library, 2026b. user-event: Clipboard. [online] Available at: <https://testing-library.com/docs/user-event/clipboard> [Accessed 10 October 2026].

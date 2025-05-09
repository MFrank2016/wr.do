import { NextRequest, NextResponse } from "next/server";

import { checkApiKey } from "@/lib/dto/api-key";
import { createUserEmail, getAllUserEmailsCount } from "@/lib/dto/email";
import { reservedAddressSuffix } from "@/lib/enums";
import { Team_Plan_Quota } from "@/lib/team";

import { siteConfig } from "../../../../config/site";

// 创建新 UserEmail
export async function POST(req: NextRequest) {
  const custom_api_key = req.headers.get("wrdo-api-key");
  if (!custom_api_key) {
    return Response.json("Unauthorized", {
      status: 401,
    });
  }

  // Check if the API key is valid
  const user = await checkApiKey(custom_api_key);
  if (!user?.id) {
    return Response.json(
      "Invalid API key. You can get your API key from https://wr.do/dashboard/settings.",
      { status: 401 },
    );
  }

  // check quota
  const user_address_count = await getAllUserEmailsCount(user.id);
  if (
    user_address_count >= Team_Plan_Quota[user.team || "free"].EM_EmailAddresses
  ) {
    return Response.json("Your email addresses have reached the free limit.", {
      status: 403,
    });
  }

  const { emailAddress } = await req.json();

  if (!emailAddress) {
    return NextResponse.json("Missing userId or emailAddress", { status: 400 });
  }

  const [prefix, suffix] = emailAddress.split("@");
  if (!prefix || prefix.length < 5) {
    return NextResponse.json("Email address length must be at least 5", {
      status: 400,
    });
  }
  if (!siteConfig.emailDomains.includes(suffix)) {
    return NextResponse.json("Invalid email suffix address", { status: 400 });
  }

  if (reservedAddressSuffix.includes(prefix)) {
    return NextResponse.json("Invalid email address", { status: 400 });
  }

  try {
    const userEmail = await createUserEmail(user.id, emailAddress);
    return NextResponse.json(userEmail, { status: 201 });
  } catch (error) {
    // console.log("Error creating user email:", error);
    if (error.message === "Invalid userId") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error.code === "P2002") {
      return NextResponse.json("Email address already exists", {
        status: 409,
      });
    }
    return NextResponse.json(error.message, { status: 500 });
  }
}

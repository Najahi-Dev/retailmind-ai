'use client'

import Image from "next/image";
import { Authenticated, Unauthenticated } from 'convex/react'
import { SignInButton, UserButton } from '@clerk/nextjs'



export default function Home() {
  return (
    <div>
      <Authenticated>
        <UserButton/>
      </Authenticated>
    </div>
  );
}

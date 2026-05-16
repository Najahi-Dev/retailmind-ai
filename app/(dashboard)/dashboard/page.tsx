'use client'

import { SignInButton, UserButton } from '@clerk/nextjs'
import { Authenticated, Unauthenticated } from 'convex/react'
import React from 'react'

const page = () => {
  return (
    <header className='flex justify-between p-4 bg-neutral-200'>
      <Authenticated>
        <UserButton />
      </Authenticated>
    </header>
  );
}

export default page
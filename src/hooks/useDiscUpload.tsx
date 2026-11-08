import { useCallback, useRef } from 'react'

import { useDiscEditor } from './useDiscEditor'

/** a hidden file input for the disc. both kinds go through the crop step */
export function useDiscUpload(kind: 'image' | 'frame' = 'image') {
  const { startCrop, startFrameCrop } = useDiscEditor()
  const ref = useRef<HTMLInputElement>(null)
  const open = useCallback(() => ref.current?.click(), [])

  const inputElement = (
    <input
      ref={ref}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file) return
        if (kind === 'frame') void startFrameCrop(file)
        else startCrop(file)
      }}
    />
  )

  return { open, inputElement }
}

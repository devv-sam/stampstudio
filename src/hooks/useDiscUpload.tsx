import { useCallback, useRef } from 'react'

import { useDiscEditor } from './useDiscEditor'

/** a hidden file input that sends the picked image to the disc's crop step */
export function useDiscUpload() {
  const { startCrop } = useDiscEditor()
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
        if (file) startCrop(file)
      }}
    />
  )

  return { open, inputElement }
}
